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
export function rma(values,period){
  let prev=null;const seed=[];return values.map(v=>{if(!Number.isFinite(v))return null;if(prev===null){seed.push(v);if(seed.length<period)return null;prev=seed.slice(-period).reduce((a,b)=>a+b,0)/period;}else prev=(prev*(period-1)+v)/period;return prev;});
}
export function stdev(values,period){return values.map((_,i)=>{if(i<period-1)return null;const w=values.slice(i-period+1,i+1);if(w.some(v=>!Number.isFinite(v)))return null;const m=w.reduce((a,b)=>a+b,0)/period;return Math.sqrt(w.reduce((a,v)=>a+(v-m)**2,0)/period);});}
export function alma(values,length=26,offset=.85,sigma=7){
  const center=offset*(length-1),s=length/sigma,weights=Array.from({length},(_,i)=>Math.exp(-((i-center)**2)/(2*s*s))),sum=weights.reduce((a,b)=>a+b,0);
  return values.map((_,i)=>{if(i<length-1)return null;const w=values.slice(i-length+1,i+1);return w.every(Number.isFinite)?w.reduce((a,v,j)=>a+v*weights[j],0)/sum:null;});
}
