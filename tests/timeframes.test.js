import test from 'node:test';import assert from 'node:assert/strict';
import {INTERVALS,NATIVE_INTERVALS,aggregateTenMinuteKlines} from '../src/timeframes.js';
import {signalSupported} from '../src/apex-signals.js';
import {normalizeKlines,evaluateRule,validateRule} from '../src/engine.js';
import handler from '../api/market.js';
const row=(t,o=100,h=105,l=99,c=103,v=10)=>[t,o,h,l,c,v,t+299999];
const response=()=>({code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;},setHeader(){}});
test('Requested chart/alert timeframes share seconds and native resolution maps',()=>{
 for(const [tf,sec] of [['5m',300],['10m',600],['15m',900],['30m',1800],['1h',3600],['4h',14400]])assert.equal(INTERVALS[tf],sec);
 assert.equal(NATIVE_INTERVALS['10'],'10m');assert.equal(NATIVE_INTERVALS['30'],'30m');
 for(const tf of ['10m','30m']){assert.equal(signalSupported({type:'perpetual'},tf),true);assert.doesNotThrow(()=>validateRule({symbol:'BTCUSDT.P',interval:tf,kind:'apex-signal'}));}
});
test('Ten-minute candles preserve actual OHLCV and UTC bucket identity',()=>{
 const result=aggregateTenMinuteKlines([row(300000,103,108,101,107,20),row(0)],700000);
 assert.deepEqual(result,[[0,100,108,99,107,30,599999]]);
});
test('Only currently open half-bucket can be partial; no invented completed price or missing-bar volume',()=>{
 const result=aggregateTenMinuteKlines([row(0)],200000);assert.equal(result[0][5],10);assert.equal(result[0][6],599999);
 assert.equal(evaluateRule({id:'r',kind:'price-above',threshold:1,enabled:true,lastEvaluated:0},normalizeKlines(result.map(r=>[r[0]+600000,...r.slice(1,6),r[6]+600000])),900000).events.length,0);
 assert.throws(()=>aggregateTenMinuteKlines([row(0)],700000),/누락/);
 assert.throws(()=>aggregateTenMinuteKlines([row(0),row(600000)],700000),/누락/);
 assert.deepEqual(aggregateTenMinuteKlines([row(300000),row(600000),row(900000)],1300000),[[600000,100,105,99,103,20,1199999]]);
});
test('Malformed or duplicate five-minute timestamps are rejected',()=>{
 assert.throws(()=>aggregateTenMinuteKlines([row(1)]));assert.throws(()=>aggregateTenMinuteKlines([row(0),row(0)]));
 const bad=row(0);bad[6]=12;assert.throws(()=>aggregateTenMinuteKlines([bad]));
});
test('Spot and futures ten-minute API request same-product five-minute rows and return aggregation metadata',async()=>{
 const before=globalThis.fetch,urls=[];globalThis.fetch=async url=>{urls.push(new URL(url));return {ok:true,status:200,json:async()=>[row(0),row(300000)]};};
 try{for(const asset of ['crypto','perpetual']){const res=response();await handler({method:'GET',query:{symbol:'BTCUSDT',asset,interval:'10m'}},res);assert.equal(res.code,200);assert.equal(res.body.data.length,1);assert.equal(res.body.aggregation,'UTC 5m × 2');assert.equal(res.body.interval,'10m');}assert.equal(urls[0].searchParams.get('interval'),'5m');assert.equal(urls[0].hostname,'data-api.binance.vision');assert.equal(urls[1].hostname,'fapi.binance.com');assert.equal(urls[1].searchParams.get('interval'),'5m');}finally{globalThis.fetch=before;}
});
test('Native 30-minute provider interval is not aggregated and restricted futures stay errors',async()=>{
 const before=globalThis.fetch;let target;globalThis.fetch=async url=>{target=new URL(url);return {ok:false,status:451};};
 try{const res=response();await handler({method:'GET',query:{symbol:'BTCUSDT',asset:'perpetual',interval:'30m'}},res);assert.equal(target.searchParams.get('interval'),'30m');assert.equal(res.code,451);assert.equal(res.body.data,undefined);}finally{globalThis.fetch=before;}
});
