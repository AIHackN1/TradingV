import {calculateApex} from './apex.js';
import {ema} from './technical.js';
import {FILTERED_INTERVALS} from './timeframes.js';
export const DEFAULT_SIGNAL_SETTINGS=Object.freeze({minScore:60,chopMax:49,gapAtr:1,cooldown:8});
export function validateSignalSettings(input={}){
 const s={...DEFAULT_SIGNAL_SETTINGS,...input};
 if(!Number.isFinite(s.minScore)||s.minScore<0||s.minScore>100||!Number.isFinite(s.chopMax)||s.chopMax<0||s.chopMax>100||!Number.isFinite(s.gapAtr)||s.gapAtr<0||s.gapAtr>10||!Number.isInteger(s.cooldown)||s.cooldown<0||s.cooldown>200)throw new Error('시그널 설정 범위를 확인하세요. 점수/CI 0~100, 터널 ATR 0~10, 대기 0~200봉.');
 return {minScore:s.minScore,chopMax:s.chopMax,gapAtr:s.gapAtr,cooldown:s.cooldown};
}
export function signalSupported(market,interval){return !!market&&market.type!=='stock'&&FILTERED_INTERVALS.includes(interval);}
function regime(data=[]){const f=ema(data.map(c=>c.close),155),s=ema(data.map(c=>c.close),162);return data.map((c,i)=>({...c,fast:f[i],slow:s[i],ready:i>=161}));}
function priorClosed(rows,time){let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].closeTime<time*1000)lo=mid+1;else hi=mid;}return rows[lo-1];}
// APEX's entry-screen subset: original 1h/4h previous confirmed EMA155/162,
// score/CI/tunnel/opposing-spike gates. Cooldown is on emitted signals, since
// there is no strategy position/exit simulator here. NOT strategy order fills.
export function calculateApexSignals(candles,context,settings=DEFAULT_SIGNAL_SETTINGS){
 const s=validateSignalSettings(settings),raw=calculateApex(candles),h1=regime(context?.h1),h4=regime(context?.h4);let lastSignal=-Infinity;
 return raw.map((r,i)=>{const a=priorClosed(h1,r.time),b=priorClosed(h4,r.time),ready=r.ready&&!!a?.ready&&!!b?.ready&&(context?.hour==null||Math.floor(r.time/3600)<=context.hour);
  if(!ready)return {...r,signalReady:false,longSignal:false,shortSignal:false,scoreLong:null,scoreShort:null,tunnelGap:null};
  const d1=a.fast-a.slow,d2=b.fast-b.slow,chop=Math.min(1,Math.max(0,(61.8-r.ci)/31.8)),vol=Math.min(1,Math.max(0,r.volZ)/2);
  const scoreLong=(d1>0?20:0)+(d2>0?20:0)+vol*15+(r.delta>0?15:0)+chop*30;
  const scoreShort=(d1<0?20:0)+(d2<0?20:0)+vol*15+(r.delta<0?15:0)+chop*30;
  const tunnelGap=Math.abs(d1),cool=i-lastSignal>=s.cooldown,gate=r.ci<s.chopMax&&(s.gapAtr<=0||Number.isFinite(r.atr)&&tunnelGap>=r.atr*s.gapAtr)&&cool;
  const up=r.asgmaUp||r.sweepUp,down=r.asgmaDown||r.sweepDown;
  const longSignal=!!(gate&&up&&!down&&(d1>0||d2>0)&&scoreLong>=s.minScore&&scoreLong>scoreShort&&!r.spikeDown);
  const shortSignal=!!(gate&&down&&!up&&(d1<0||d2<0)&&scoreShort>=s.minScore&&scoreShort>scoreLong&&!r.spikeUp);
  if(longSignal||shortSignal)lastSignal=i;
  return {...r,signalReady:true,scoreLong,scoreShort,tunnelGap,longSignal,shortSignal};
 });
}
export function apexSignalDetail(rule,candles,context){
 if(rule.kind==='apex-signal'){const r=calculateApexSignals(candles,context,rule.signalSettings).at(-1);if(!r?.signalReady)return null;if(r.longSignal)return {direction:'LONG',labels:['APEX 점수필터'],score:r.scoreLong};if(r.shortSignal)return {direction:'SHORT',labels:['APEX 점수필터'],score:r.scoreShort};return null;}
 if(rule.kind==='apex-any'){const r=calculateApex(candles).at(-1);if(!r)return null;const keys=rule.components||{asgma:true,sweep:true,spike:true},labels=[];let up=false,down=false;
  for(const [id,label] of [['asgma','ASGMA'],['sweep','스윕'],['spike','스파이크']])if(keys[id]){if(r[id+'Up']){labels.push(label+' 상방');up=true;}if(r[id+'Down']){labels.push(label+' 하방');down=true;}}
  return labels.length?{direction:up&&down?'BOTH':up?'LONG':'SHORT',labels}:null;
 }
 return null;
}
