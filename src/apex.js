// Component calculations ported from the user's APEX FINAL v1.7 source.
// Raw candidates only: NOT the full HTF/score/cooldown/position/exit strategy.
import {ema,sma,rsi,rma,stdev,alma} from './technical.js';
export const APEX_COMPONENTS=[
  {id:'asgma',name:'ASGMA 모멘텀',description:'ALMA(26) · GMA(14/7) · RSI/CMO 방향 필터',scope:'원본 트리거 A · 최종 진입 게이트 미적용',color:'#6edbc1'},
  {id:'sweep',name:'WhaleFlow 유동성 스윕',description:'이전 20봉 극값 · 꼬리 30% · 거래량 Z ≥ 2',scope:'원본 트리거 B · 캔들 근사 델타',color:'#77b7ff'},
  {id:'spike',name:'ATR 스파이크 감지',description:'ATR(14) × 2.5 · 거래량 Z ≥ 1.5 · 흐름 반전',scope:'원본 급변동 조건 · 포지션 청산은 미실행',color:'#efbf73'},
];
export function calculateApex(candles){
  if(!candles.length)return [];
  const close=candles.map(c=>c.close),vol=candles.map(c=>c.volume),src=candles.map(c=>(c.open+c.high+c.low+c.close)/4),pct=src.map((v,i)=>i?(v-src[i-1])/v*100:null),avp=alma(pct),sigma=stdev(close,20),rs=rsi(close,14);
  const changes=close.map((v,i)=>i?v-close[i-1]:null),pos=sma(changes.map(v=>v===null?null:Math.max(v,0)),9),neg=sma(changes.map(v=>v===null?null:Math.max(-v,0)),9),cmo=pos.map((v,i)=>v===null||neg[i]===null?null:v+neg[i]===0?0:100*(v-neg[i])/(v+neg[i]));
  const gmaRaw=avp.map((v,index)=>{
    if(!Number.isFinite(v)||index<13)return null;let sum=0,weights=0;
    for(let i=0;i<14;i++){const window=avp.slice(index-i,index+1).filter(Number.isFinite);if(!window.length)return null;const weight=Math.exp(-(((i-13)/(2*Math.max(sigma[index]??0,1e-10)))**2)/2);sum+=(Math.max(...window)+Math.min(...window))*weight;weights+=weight;}
    return weights>0?sum/weights/2:null;
  }),gma=ema(gmaRaw,7);
  const tr=candles.map((c,i)=>i?Math.max(c.high-c.low,Math.abs(c.high-close[i-1]),Math.abs(c.low-close[i-1])):c.high-c.low),atr=rma(tr,14),vma=sma(vol,50),vsd=stdev(vol,50);
  return candles.map((c,i)=>{
    const range=c.high-c.low,delta=range>0?c.volume*(c.close-c.open)/range:0,volZ=vma[i]!==null&&vsd[i]>0?(c.volume-vma[i])/vsd[i]:0;
    const prior=candles.slice(Math.max(0,i-20),i),liqLow=prior.length===20?Math.min(...prior.map(c=>c.low)):null,liqHigh=prior.length===20?Math.max(...prior.map(c=>c.high)):null;
    const lowWick=range>0?(Math.min(c.open,c.close)-c.low)/range*100:0,highWick=range>0?(c.high-Math.max(c.open,c.close))/range*100:0;
    const last14=candles.slice(Math.max(0,i-13),i+1),chopRange=last14.length===14?Math.max(...last14.map(c=>c.high))-Math.min(...last14.map(c=>c.low)):0,chopSum=tr.slice(Math.max(0,i-13),i+1).reduce((a,b)=>a+b,0),ci=chopRange>0?100*Math.log10(chopSum/chopRange)/Math.log10(14):100;
    const valid=i>0&&[avp[i-1],gma[i-1],gma[i],rs[i-1],rs[i],cmo[i],cmo[i-1]].every(Number.isFinite);
    const asgmaUp=valid&&avp[i-1]<=gma[i-1]&&avp[i]>gma[i]&&rs[i]>rs[i-1]&&cmo[i]>cmo[i-1]&&rs[i]<=70;
    const asgmaDown=valid&&avp[i-1]>=gma[i-1]&&avp[i]<gma[i]&&rs[i]<rs[i-1]&&cmo[i]<cmo[i-1]&&rs[i]>=30;
    const sweepUp=liqLow!==null&&c.low<liqLow&&c.close>liqLow&&lowWick>=30&&volZ>=2&&(delta>0||c.close>(c.high+c.low)/2);
    const sweepDown=liqHigh!==null&&c.high>liqHigh&&c.close<liqHigh&&highWick>=30&&volZ>=2&&(delta<0||c.close<(c.high+c.low)/2);
    const drift=i>=11?close[i-1]-close[i-11]:null,hasAtr=Number.isFinite(atr[i]);
    const spikeUp=hasAtr&&drift!==null&&range>=atr[i]*2.5&&c.close>=c.high-range*.25&&volZ>=1.5&&drift<0;
    const spikeDown=hasAtr&&drift!==null&&range>=atr[i]*2.5&&c.close<=c.low+range*.25&&volZ>=1.5&&drift>0;
    return {time:c.time,closeTime:c.closeTime,avp:avp[i],gma:gma[i],rsi:rs[i],cmo:cmo[i],atr:atr[i],volZ,delta,ci,asgmaUp,asgmaDown,sweepUp,sweepDown,spikeUp,spikeDown,ready:i>=49};
  });
}
