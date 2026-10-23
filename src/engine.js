import {customSignalDetail,validateCustomIndicator} from './custom-indicators.js';
import {apexSignalDetail,validateSignalSettings,signalSupported} from './apex-signals.js';
import {MARKETS} from './markets.js';
export {MARKETS} from './markets.js';
import {studyCondition} from './studies.js';
import {ema,rsi} from './technical.js';
import {calculateApex} from './apex.js';
export {ema,sma,rsi} from './technical.js';
// Pure calculations shared by chart overlays and the alert monitor.
export const DEFAULT_CLOUDS = [
  {name:'초록',fast:144,slow:155,color:'#19cc9a'},
  {name:'주황',fast:89,slow:100,color:'#ffad55'},
  {name:'파랑',fast:55,slow:65,color:'#52a5ff'},
  {name:'보라',fast:34,slow:40,color:'#ab83ff'},
];
export const INTERVALS = {'1m':60,'5m':300,'15m':900,'1h':3600,'4h':14400,'1d':86400};
export function normalizeKlines(rows){
  if(!Array.isArray(rows))throw new Error('잘못된 시세 응답입니다.');
  const sorted=rows.map(r=>({time:Number(r[0])/1000,open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5]),closeTime:Number(r[6])})).sort((a,b)=>a.time-b.time);
  if(sorted.some(c=>!Object.values(c).every(Number.isFinite)||c.high<Math.max(c.open,c.close)||c.low>Math.min(c.open,c.close)||c.time<=0||c.volume<0))throw new Error('유효하지 않은 캔들이 포함되어 있습니다.');
  return sorted.filter((c,i)=>i===0||c.time!==sorted[i-1].time);
}
export function confirmedCandles(candles,now=Date.now()){return candles.filter(c=>c.closeTime<now);}
export function conditionMatches(rule,candles,context){
  if(rule.kind==='custom-signal')return !!customSignalDetail(rule,candles);
  if(rule.kind==='apex-signal'||rule.kind==='apex-any')return !!apexSignalDetail(rule,candles,context);
  if(/^(bb|dc|supertrend|vwap)-/.test(rule.kind))return studyCondition(rule,candles);
  const apexKeys={'asgma-up':'asgmaUp','asgma-down':'asgmaDown','sweep-up':'sweepUp','sweep-down':'sweepDown','spike-up':'spikeUp','spike-down':'spikeDown'};
  if(apexKeys[rule.kind])return !!calculateApex(candles).at(-1)?.[apexKeys[rule.kind]];
  if(candles.length<2)return false;
  const prices=candles.map(c=>c.close),n=prices.length-1;
  if(rule.kind==='price-above')return prices[n-1]<=rule.threshold&&prices[n]>rule.threshold;
  if(rule.kind==='price-below')return prices[n-1]>=rule.threshold&&prices[n]<rule.threshold;
  if(rule.kind==='rsi-above'||rule.kind==='rsi-below'){
    const v=rsi(prices,rule.period||14);if(v[n-1]===null||v[n]===null)return false;
    return rule.kind==='rsi-above'?v[n-1]<=rule.threshold&&v[n]>rule.threshold:v[n-1]>=rule.threshold&&v[n]<rule.threshold;
  }
  if(rule.kind==='ema-up'||rule.kind==='ema-down'){
    if(candles.length<Math.max(rule.fast,rule.slow)+2)return false;
    const a=ema(prices,rule.fast),b=ema(prices,rule.slow);
    return rule.kind==='ema-up'?a[n-1]<=b[n-1]&&a[n]>b[n]:a[n-1]>=b[n-1]&&a[n]<b[n];
  }
  return false;
}
// Fresh/restarted rules establish a baseline; they never replay an old signal.
// Once monitoring, every newly closed candle is evaluated, including reconnect gaps.
export function evaluateRule(rule,candles,now=Date.now(),context){
  const closed=confirmedCandles(candles,now);if(!closed.length)return {rule,events:[]};
  if(rule.lastEvaluated==null){
    if(!Number.isFinite(rule.armedAt))return {rule:{...rule,lastEvaluated:closed.at(-1).time},events:[]};
    const baseline=closed.filter(c=>c.closeTime<rule.armedAt).at(-1);
    rule={...rule,lastEvaluated:baseline?.time??0};
  }
  const events=[];let next={...rule};
  for(let i=0;i<closed.length;i++){
    const c=closed[i];if(c.time<=next.lastEvaluated)continue;
    if(next.enabled&&conditionMatches(next,closed.slice(0,i+1),context)){
      events.push({id:`${rule.id}:${c.time}`,ruleId:rule.id,symbol:rule.symbol,interval:rule.interval,kind:rule.kind,title:rule.name,...(rule.kind==='custom-signal'?{signal:customSignalDetail(next,closed.slice(0,i+1))}:rule.kind.startsWith('apex-')?{signal:apexSignalDetail(next,closed.slice(0,i+1),context)}:{}),price:c.close,barTime:c.time,detectedAt:now});
      if(rule.once)next.enabled=false;
    }
    next.lastEvaluated=c.time;
  }
  return {rule:next,events};
}
export function validateIndicator(config){
  if(!config||config.version!==1||!Array.isArray(config.clouds)||config.clouds.length>8)throw new Error('version: 1, clouds 배열(최대 8개)이 필요합니다.');
  return {version:1,name:String(config.name||'내 EMA 구름대').slice(0,70),clouds:config.clouds.map(c=>{
    if(!Number.isInteger(c.fast)||!Number.isInteger(c.slow)||Math.min(c.fast,c.slow)<1||Math.max(c.fast,c.slow)>400)throw new Error('EMA 기간은 1~400 사이의 정수여야 합니다.');
    if(!/^#[0-9a-f]{6}$/i.test(c.color))throw new Error('색상은 #RRGGBB 형식이어야 합니다.');
    return {name:String(c.name||'EMA').slice(0,30),fast:c.fast,slow:c.slow,color:c.color};
  })};
}
export function validateRule(r,markets=MARKETS){
  if(markets.find(m=>m.symbol===r.symbol)?.type==='stock'&&r.interval!=='1d')throw new Error('자체 미국 주식 알람은 정규장 일봉만 지원합니다.');
  if(!markets.some(m=>m.symbol===r.symbol)||!INTERVALS[r.interval])throw new Error('지원하지 않는 종목 또는 시간봉입니다.');
  if(!['custom-signal','apex-signal','apex-any','price-above','price-below','ema-up','ema-down','rsi-above','rsi-below','asgma-up','asgma-down','sweep-up','sweep-down','spike-up','spike-down','bb-up','bb-down','dc-up','dc-down','supertrend-up','supertrend-down','vwap-up','vwap-down'].includes(r.kind))throw new Error('지원하지 않는 알람 조건입니다.');
  if(r.kind==='custom-signal'){const indicator=validateCustomIndicator(r.indicator);if(!indicator.signals.length)throw new Error('알람에 사용할 시그널이 없습니다.');return {...r,indicator};}
  if(r.kind==='apex-signal'){if(!signalSupported(markets.find(m=>m.symbol===r.symbol),r.interval))throw new Error('APEX 점수필터 시그널은 현물/선물의 1분~1시간봉에서 사용하세요.');return {...r,signalSettings:validateSignalSettings(r.signalSettings)};}
  if(r.kind==='apex-any'){const components=r.components||{asgma:true,sweep:true,spike:true};if(!['asgma','sweep','spike'].some(k=>components[k]===true))throw new Error('감시할 후보 구성요소를 하나 이상 선택하세요.');return {...r,components:Object.fromEntries(['asgma','sweep','spike'].map(k=>[k,components[k]===true]))};}
  if(r.kind.startsWith('vwap-')&&(r.interval==='1d'||markets.find(m=>m.symbol===r.symbol)?.type==='stock'))throw new Error('세션 VWAP 알람은 암호화폐 분봉에서 사용하세요.');
  if(/^(asgma|sweep|spike|bb|dc|supertrend|vwap)-/.test(r.kind))return r;
  if(r.kind.startsWith('ema')){
    if(!Number.isInteger(r.fast)||!Number.isInteger(r.slow)||Math.min(r.fast,r.slow)<1||Math.max(r.fast,r.slow)>400||r.fast===r.slow)throw new Error('서로 다른 EMA 기간(1~400)을 입력하세요.');
  }else if(!Number.isFinite(r.threshold)||r.threshold<=0||(r.kind.startsWith('rsi')&&r.threshold>=100))throw new Error('유효한 기준값을 입력하세요. RSI는 0~100 사이입니다.');
  return r;
}
export function sampleCandles(interval='15m'){
  const sec=INTERVALS[interval];const end=Math.floor(Date.now()/1000/sec)*sec;let p=65000,seed=42;
  const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  return Array.from({length:700},(_,i)=>{const time=end-(699-i)*sec,open=p;const close=open+(rand()-.48)*360+Math.sin(i/35)*30;p=close;return {time,open,close,high:Math.max(open,close)+rand()*110,low:Math.min(open,close)-rand()*110,volume:20+rand()*150,closeTime:(time+sec)*1000-1};});
}
