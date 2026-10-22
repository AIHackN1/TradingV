// Pure calculations shared by chart overlays and the alert monitor.
export const DEFAULT_CLOUDS = [
  {name:'초록',fast:144,slow:155,color:'#19cc9a'},
  {name:'주황',fast:89,slow:100,color:'#ffad55'},
  {name:'파랑',fast:55,slow:65,color:'#52a5ff'},
  {name:'보라',fast:34,slow:40,color:'#ab83ff'},
];
export const INTERVALS = {'1m':60,'5m':300,'15m':900,'1h':3600,'4h':14400,'1d':86400};
export const MARKETS = [
  {symbol:'SOXL',name:'Semiconductor Bull 3X',code:'SOXL',color:'#80b2ff',type:'stock',currency:'USD',tvSymbol:'AMEX:SOXL'},
  {symbol:'BTCUSDT',name:'Bitcoin',code:'BTC',color:'#f6ae42'},
  {symbol:'ETHUSDT',name:'Ethereum',code:'ETH',color:'#9f9fff'},
  {symbol:'SOLUSDT',name:'Solana',code:'SOL',color:'#70dbbb'},
  {symbol:'XRPUSDT',name:'XRP',code:'XRP',color:'#cad1de'},
  {symbol:'BNBUSDT',name:'BNB',code:'BNB',color:'#eac664'},
  {symbol:'DOGEUSDT',name:'Dogecoin',code:'DOGE',color:'#cfb66f'},
  {symbol:'AVAXUSDT',name:'Avalanche',code:'AVAX',color:'#ee7781'},
  {symbol:'LINKUSDT',name:'Chainlink',code:'LINK',color:'#81aaff'},
];
export function ema(values,period){
  const k=2/(period+1); let previous;
  return values.map(v=>{if(!Number.isFinite(v))return null;previous=previous===undefined?v:k*v+(1-k)*previous;return previous;});
}
export function sma(values,period){
  return values.map((_,i)=>{const a=values.slice(Math.max(0,i-period+1),i+1);return a.length===period&&a.every(Number.isFinite)?a.reduce((s,v)=>s+v,0)/period:null;});
}
export function rsi(values,period=14){
  const out=Array(values.length).fill(null);if(values.length<=period)return out;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
  gain/=period;loss/=period;
  const value=()=>loss===0?(gain===0?50:100):100-100/(1+gain/loss);
  out[period]=value();
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period;out[i]=value();}
  return out;
}
export function normalizeKlines(rows){
  if(!Array.isArray(rows))throw new Error('잘못된 시세 응답입니다.');
  const sorted=rows.map(r=>({time:Number(r[0])/1000,open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5]),closeTime:Number(r[6])})).sort((a,b)=>a.time-b.time);
  if(sorted.some(c=>!Object.values(c).every(Number.isFinite)||c.high<Math.max(c.open,c.close)||c.low>Math.min(c.open,c.close)||c.time<=0))throw new Error('유효하지 않은 캔들이 포함되어 있습니다.');
  return sorted.filter((c,i)=>i===0||c.time!==sorted[i-1].time);
}
export function confirmedCandles(candles,now=Date.now()){return candles.filter(c=>c.closeTime<now);}
export function conditionMatches(rule,candles){
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
export function evaluateRule(rule,candles,now=Date.now()){
  const closed=confirmedCandles(candles,now);if(!closed.length)return {rule,events:[]};
  if(rule.lastEvaluated==null)return {rule:{...rule,lastEvaluated:closed.at(-1).time},events:[]};
  const events=[];let next={...rule};
  for(let i=0;i<closed.length;i++){
    const c=closed[i];if(c.time<=next.lastEvaluated)continue;
    if(next.enabled&&conditionMatches(next,closed.slice(0,i+1))){
      events.push({id:`${rule.id}:${c.time}`,ruleId:rule.id,symbol:rule.symbol,interval:rule.interval,kind:rule.kind,title:rule.name,price:c.close,barTime:c.time,detectedAt:now});
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
export function validateRule(r){
  if(r.symbol==='SOXL'&&r.interval!=='1d')throw new Error('자체 SOXL 알람은 정규장 일봉만 지원합니다.');
  if(!MARKETS.some(m=>m.symbol===r.symbol)||!INTERVALS[r.interval])throw new Error('지원하지 않는 종목 또는 시간봉입니다.');
  if(!['price-above','price-below','ema-up','ema-down','rsi-above','rsi-below'].includes(r.kind))throw new Error('지원하지 않는 알람 조건입니다.');
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
