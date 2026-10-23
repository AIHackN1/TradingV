import test from 'node:test';
import assert from 'node:assert/strict';
import {observeCandles,candleCutoff} from '../src/candle-observation.js';
import {normalizeKlines,confirmedCandles,evaluateRule} from '../src/engine.js';
import {runMonitorPass} from '../src/alert-monitor.js';
import handler from '../api/market.js';
const start=1700000040000;
const rows=last=>[[start,90,90,90,90,1,start+59999],[start+60000,last,last,last,last,1,start+119999]];
const rule={id:'r',symbol:'BTCUSDT',interval:'1m',kind:'price-above',threshold:100,enabled:true,lastEvaluated:start/1000,once:false};
function observed(last,at){const input=rows(last);input.fetchedAt=at;return normalizeKlines(input);}
test('Normalization preserves source observation time without changing serialized candle arrays',()=>{
 const input=rows(110);input.fetchedAt=start+90000;const data=normalizeKlines(input);
 assert.equal(data.observedAt,start+90000);assert.equal(Object.keys(data).length,2);
 assert.deepEqual(JSON.parse(JSON.stringify(data)),data.map(c=>({...c})));
 assert.throws(()=>observeCandles(data,NaN));
});
test('Cached unfinished cross never closes just because wall clock passes its scheduled close',()=>{
 const cached=observed(110,start+90000),later=start+180000;
 const result=evaluateRule(rule,cached,later);
 assert.equal(confirmedCandles(cached,later).length,1);assert.equal(result.events.length,0);assert.equal(result.rule.lastEvaluated,rule.lastEvaluated);
 // Actual final close recedes below the trigger. The transient cached cross
 // must never have advanced the cursor or delivered a false alert.
 const actual=observed(95,start+130000);const final=evaluateRule(result.rule,actual,later);
 assert.equal(final.events.length,0);assert.equal(final.rule.lastEvaluated,(start+60000)/1000);
});
test('Fresh confirmed cross emits once, preserving actual detection time',()=>{
 const cached=observed(110,start+90000);const first=evaluateRule(rule,cached,start+180000);
 const fresh=observed(110,start+130000);const result=evaluateRule(first.rule,fresh,start+190000);
 assert.equal(result.events.length,1);assert.equal(result.events[0].detectedAt,start+190000);assert.equal(result.events[0].barTime,(start+60000)/1000);
 assert.equal(evaluateRule(result.rule,fresh,start+250000).events.length,0);
});
test('Exchange observation may advance on a live update, but a future source timestamp cannot bypass wall clock',()=>{
 const data=observed(110,start+90000);assert.equal(candleCutoff(data,start+180000),start+90000);
 observeCandles(data,start+130000);assert.equal(confirmedCandles(data,start+180000).length,2);
 assert.equal(confirmedCandles(data,start+100000).length,1);
});
test('Live monitor reusing a cached chart snapshot waits for a fresh observation before delivery',async()=>{
 let rules=[{...rule}],data=observed(110,start+90000);const events=[];
 const options={getRules:()=>rules,fetchCandles:async()=>({candles:data}),applyRule:r=>{rules=[r];},onEvent:e=>events.push(e),now:()=>start+180000};
 await runMonitorPass(options);await runMonitorPass(options);assert.equal(events.length,0);assert.equal(rules[0].lastEvaluated,rule.lastEvaluated);
 data=observed(110,start+130000);await runMonitorPass(options);await runMonitorPass(options);assert.equal(events.length,1);
});
test('API stamps the start of the provider query rather than the delayed response completion',async()=>{
 const previousFetch=globalThis.fetch,previousNow=Date.now;let clock=start+90000;Date.now=()=>clock;
 globalThis.fetch=async()=>{clock=start+130000;return {ok:true,json:async()=>rows(110)};};
 try{const res={code:200,status(n){this.code=n;return this;},setHeader(){},json(body){this.body=body;return this;}};
 await handler({method:'GET',query:{symbol:'BTCUSDT',asset:'crypto',interval:'1m'}},res);
 assert.equal(res.code,200);assert.equal(res.body.fetchedAt,start+90000);
 const input=res.body.data;input.fetchedAt=res.body.fetchedAt;assert.equal(evaluateRule(rule,normalizeKlines(input),clock).events.length,0);
 }finally{globalThis.fetch=previousFetch;Date.now=previousNow;}
});
