import {ema,sma} from './technical.js';
// Data-only recipes: the same evaluator is used by chart renderers and alarms.
// This is an explicit subset, not a Pine/JavaScript runtime.
const sources=['open','high','low','close','hl2','hlc3','ohlc4'];
export function validateCustomIndicator(input){
 if(!input||input.type!=='tradingv-indicator'||input.version!==1)throw new Error('사용자 지표는 type: tradingv-indicator, version: 1인 JSON이어야 합니다. Pine/JS 실행은 지원하지 않습니다.');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>70)throw new Error('지표 이름은 1~70자입니다.');
 if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>8)throw new Error('이동평균 선은 1~8개입니다.');
 const ids=new Set(),lines=input.lines.map(l=>{
  if(!l||typeof l.id!=='string'||!/^[a-z][a-z0-9_]{0,23}$/.test(l.id)||ids.has(l.id))throw new Error('선 ID는 중복 없는 영문 소문자/숫자/밑줄이어야 합니다.');ids.add(l.id);
  if(!['ema','sma'].includes(l.method)||!sources.includes(l.source)||!Number.isInteger(l.period)||l.period<1||l.period>400||!/^#[a-f\d]{6}$/i.test(l.color))throw new Error('EMA/SMA, 지원 가격 소스, 기간1~400, #RRGGBB 색상을 확인하세요.');
  return {id:l.id,method:l.method,source:l.source,period:l.period,color:l.color};
 });
 if(!Array.isArray(input.signals)||input.signals.length>4)throw new Error('시그널은 최대4개입니다.');
 const signals=input.signals.map(s=>{if(!s||!['cross-up','cross-down'].includes(s.op)||!ids.has(s.left)||!ids.has(s.right)||s.left===s.right||!['LONG','SHORT'].includes(s.direction))throw new Error('시그널은 서로 다른 두 선의 상향/하향 교차와 LONG/SHORT 방향을 지정하세요.');return {op:s.op,left:s.left,right:s.right,direction:s.direction};});
 return {type:'tradingv-indicator',version:1,name:input.name.trim(),lines,signals};
}
function sourceValue(c,key){if(key==='hl2')return(c.high+c.low)/2;if(key==='hlc3')return(c.high+c.low+c.close)/3;if(key==='ohlc4')return(c.open+c.high+c.low+c.close)/4;return c[key];}
export function calculateCustomIndicator(candles,input){
 const recipe=validateCustomIndicator(input),values={};
 for(const l of recipe.lines){const data=candles.map(c=>sourceValue(c,l.source));values[l.id]=(l.method==='ema'?ema:sma)(data,l.period).map((v,i)=>i<l.period-1?null:v);}
 return candles.map((c,i)=>{const hits=[];
  for(const s of recipe.signals){const a=values[s.left],b=values[s.right];if(i<1||![a[i-1],b[i-1],a[i],b[i]].every(Number.isFinite))continue;
   if(s.op==='cross-up'?a[i-1]<=b[i-1]&&a[i]>b[i]:a[i-1]>=b[i-1]&&a[i]<b[i])hits.push({direction:s.direction,label:`${s.left}/${s.right} ${s.op==='cross-up'?'상향':'하향'} 교차`});
  }
  const directions=new Set(hits.map(h=>h.direction));return {time:c.time,closeTime:c.closeTime,values:Object.fromEntries(recipe.lines.map(l=>[l.id,values[l.id][i]])),signal:hits.length?{direction:directions.size>1?'BOTH':hits[0].direction,labels:hits.map(h=>h.label)}:null};
 });
}
export function customSignalDetail(rule,candles){return calculateCustomIndicator(candles,rule.indicator).at(-1)?.signal??null;}
export const EXAMPLE_CUSTOM_INDICATOR={type:'tradingv-indicator',version:1,name:'내 EMA 20/60 교차',lines:[{id:'fast',method:'ema',source:'close',period:20,color:'#49d6ad'},{id:'slow',method:'ema',source:'close',period:60,color:'#c3a5ff'}],signals:[{op:'cross-up',left:'fast',right:'slow',direction:'LONG'},{op:'cross-down',left:'fast',right:'slow',direction:'SHORT'}]};
export function validateCustomLibrary(items){if(!Array.isArray(items)||items.length>12)throw new Error('사용자 지표는 최대12개입니다.');const ids=new Set();return items.map(x=>{if(!x||typeof x.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(x.id)||ids.has(x.id))throw new Error('사용자 지표 ID가 잘못되었거나 중복되었습니다.');ids.add(x.id);return {id:x.id,visible:x.visible!==false,recipe:validateCustomIndicator(x.recipe)};});}
