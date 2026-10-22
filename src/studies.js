import {sma,stdev,rma} from './technical.js';
// Independently implemented public formulas. These are NOT ATH's proprietary signals.
export const STUDIES=[
{id:'bb',name:'볼린저 밴드',color:'#e4bd6b',description:'SMA(20) ± 표준편차(20) × 2 · 변동성 범위'},
{id:'donchian',name:'돈치안 돌파 채널',color:'#67baf7',description:'이전 20봉 최고·최저 · 현재 봉 제외, 돌파 기준'},
{id:'supertrend',name:'슈퍼트렌드',color:'#5dd5a5',description:'Wilder ATR(10) × 3 · 방향 전환과 추세선'},
{id:'vwap',name:'세션 VWAP',color:'#df91f0',description:'HLC3 × 거래량 누적 평균 · 암호화폐 UTC 일자 · 일봉은 미지원'},
{id:'profile',name:'거래량 프로파일 근사',color:'#8c91e8',description:'최근 200봉 · 24개 가격 구간에 고저 범위별 거래량 균등배분 · 실체결/호가 아님'},
];
export function calculateStudies(candles,interval='15m'){
 const close=candles.map(c=>c.close),mean=sma(close,20),sd=stdev(close,20);
 const atr=rma(candles.map((c,i)=>Math.max(c.high-c.low,i?Math.abs(c.high-close[i-1]):0,i?Math.abs(c.low-close[i-1]):0)),10);
 let pv=0,vol=0,day='',upper=null,lower=null,trend=-1;
 return candles.map((c,i)=>{
  const date=new Date(c.time*1000).toISOString().slice(0,10);if(date!==day){day=date;pv=0;vol=0;}pv+=(c.high+c.low+c.close)/3*c.volume;vol+=c.volume;
  const prior=candles.slice(Math.max(0,i-20),i);let line=null;
  if(atr[i]!==null){const mid=(c.high+c.low)/2,u=mid+3*atr[i],l=mid-3*atr[i];
    upper=upper===null||u<upper||close[i-1]>upper?u:upper;
    lower=lower===null||l>lower||close[i-1]<lower?l:lower;
    if(i===0||atr[i-1]===null)trend=-1;else if(trend===-1)trend=c.close>upper?1:-1;else trend=c.close<lower?-1:1;
    line=trend===1?lower:upper;
  }
  return {time:c.time,bbMiddle:mean[i],bbUpper:mean[i]===null?null:mean[i]+2*sd[i],bbLower:mean[i]===null?null:mean[i]-2*sd[i],dcUpper:prior.length===20?Math.max(...prior.map(c=>c.high)):null,dcLower:prior.length===20?Math.min(...prior.map(c=>c.low)):null,supertrend:line,supertrendUp:line!==null&&trend===1?line:null,supertrendDown:line!==null&&trend===-1?line:null,direction:line===null?null:trend,vwap:interval==='1d'||vol===0?null:pv/vol};
 });
}
export function volumeProfile(candles,bins=24){
 const data=candles.slice(-200);if(!data.length)return [];const low=Math.min(...data.map(c=>c.low)),high=Math.max(...data.map(c=>c.high)),step=(high-low||Math.max(Math.abs(low)*.001,.001))/bins;
 const rows=Array.from({length:bins},(_,i)=>({low:low+i*step,high:low+(i+1)*step,volume:0}));
 for(const c of data){if(c.high===c.low){rows[Math.min(bins-1,Math.max(0,Math.floor((c.close-low)/step)))].volume+=c.volume;continue;}for(const r of rows)r.volume+=c.volume*Math.max(0,Math.min(c.high,r.high)-Math.max(c.low,r.low))/(c.high-c.low);}
 return rows;
}
export class ProfilePrimitive{
 constructor(rows){this.rows=rows;this.view={zOrder:()=> 'bottom',renderer:()=>({draw:target=>this.draw(target)})};}
 attached({chart,series}){this.chart=chart;this.series=series;}detached(){this.chart=null;}updateAllViews(){}paneViews(){return [this.view];}
 draw(target){if(!this.chart)return;target.useBitmapCoordinateSpace(({context:ctx,horizontalPixelRatio:h,verticalPixelRatio:v})=>{const max=Math.max(...this.rows.map(r=>r.volume),1),width=this.chart.paneSize().width;for(const r of this.rows){const a=this.series.priceToCoordinate(r.high),b=this.series.priceToCoordinate(r.low);if(a===null||b===null)continue;const w=r.volume/max*Math.min(width*.25,150);ctx.fillStyle=r.volume===max?'#bda5fc65':'#8c91e82a';ctx.fillRect((width-w)*h,a*v,w*h,Math.max(1,(b-a)*v));}});}
}
export function studyCondition(rule,candles){
 if(candles.length<2)return false;const s=calculateStudies(candles,rule.interval),a=s.at(-2),b=s.at(-1),p=candles.at(-2).close,c=candles.at(-1).close;
 const field=rule.kind.startsWith('bb-')?(rule.kind.endsWith('up')?'bbUpper':'bbLower'):rule.kind.startsWith('dc-')?(rule.kind.endsWith('up')?'dcUpper':'dcLower'):rule.kind.startsWith('vwap-')?'vwap':null;
 if(rule.kind.startsWith('supertrend-'))return a.direction!==null&&b.direction!==null&&a.direction!==b.direction&&b.direction===(rule.kind.endsWith('up')?1:-1);
 if(!field||a[field]===null||b[field]===null)return false;
 return rule.kind.endsWith('up')?p<=a[field]&&c>b[field]:p>=a[field]&&c<b[field];
}
