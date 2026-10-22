import {evaluateRule} from './engine.js';

// One read/evaluate pass. Always resolve current rule/suspension state AFTER the
// provider responds: it may have changed while the request was in flight.
export async function runMonitorPass({getRules,fetchCandles,isSuspended=()=>false,applyRule,onEvent,now=Date.now}){
  const active=getRules().filter(r=>r.enabled&&!isSuspended(r));
  const groups=new Map();
  for(const r of active){const key=`${r.symbol}:${r.interval}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  let evaluated=0,events=0;
  const results=await Promise.allSettled([...groups.values()].map(async originals=>{
    const {symbol,interval}=originals[0];const data=await fetchCandles(symbol,interval);
    if(!Array.isArray(data)||!data.length)throw new Error('No market candles');
    for(const original of originals){
      const current=getRules().find(r=>r.id===original.id);
      if(!current?.enabled||current.symbol!==symbol||current.interval!==interval||isSuspended(current))continue;
      const result=evaluateRule(current,data,now());
      applyRule(result.rule);evaluated++;
      for(const event of result.events){onEvent(event);events++;}
    }
  }));
  return {groups:groups.size,evaluated,events,failures:results.filter(r=>r.status==='rejected').length};
}
