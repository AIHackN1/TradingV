import test from 'node:test';
import assert from 'node:assert/strict';
import {createApexDatafeed} from '../src/advanced/datafeed.js';
import {createApexSession} from '../src/advanced/apex-session.js';
const symbol='BINANCE:BTCUSDT.P';
const markets=[{symbol:'BTCUSDT.P',tvSymbol:symbol,name:'BTC perpetual',type:'perpetual',pricescale:10,minmov:1},{symbol:'BTCUSDT',tvSymbol:'BINANCE:BTCUSDT',name:'BTC spot',type:'crypto',pricescale:100,minmov:1}];
const candle=time=>({time,open:100,high:102,low:99,close:101,volume:5,closeTime:(time+60)*1000-1});
const snapshot=(times,observedAt=1000000)=>({candles:times.map(candle),observedAt});
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function setup(history){const subscriptions=[],errors=[],session=createApexSession();const source={history,subscribe(options){subscriptions.push(options);return ()=>{options.stopped=true;};}};return {feed:createApexDatafeed({markets,source,session,onError:e=>errors.push(e)}),session,subscriptions,errors};}
const get=(feed,from=120,to=300,countBack=3)=>new Promise((resolve,reject)=>feed.getBars({ticker:symbol},'1',{from,to,countBack},(bars,meta)=>resolve({bars,meta}),message=>reject(new Error(message))));
test('History callbacks are asynchronous, use milliseconds, retain pages and pass detached bars',async()=>{
 let current=snapshot([120,180,240]);const {feed,session}=setup(async()=>current);
 const first=await get(feed);assert.deepEqual(first.bars.map(c=>c.time),[120000,180000,240000]);
 first.bars[0].close=999;assert.equal(session.read(symbol,'1').candles[0].close,101);
 current=snapshot([60,120],1000001);assert.deepEqual((await get(feed,60,180,2)).bars.map(c=>c.time),[60000,120000]);
 assert.deepEqual(session.read(symbol,'1').candles.map(c=>c.time),[60,120,180,240]);
 let sync=true;await new Promise(resolve=>{feed.onReady(()=>{assert.equal(sync,false);resolve();});sync=false;});
});
test('Provider access denial stays an error; empty gap is not fabricated end-of-history',async()=>{
 const denied=setup(async()=>{throw new Error('FUTURES_ACCESS_RESTRICTED');});
 await assert.rejects(get(denied.feed),/FUTURES_ACCESS_RESTRICTED/);assert.equal(denied.session.read(symbol,'1'),undefined);
 const gap=setup(async()=>snapshot([]));await assert.rejects(get(gap.feed),/이력 종료/);
 const end=setup(async()=>({...snapshot([]),noData:true}));assert.deepEqual(await get(end.feed),{bars:[],meta:{noData:true}});
});
test('Unsubscribe prevents queued and late stream updates; spot and futures remain distinct',async()=>{
 const {feed,session,subscriptions}=setup(async()=>snapshot([120]));const got=[];
 feed.subscribeBars({ticker:symbol},'1',b=>got.push(b),'a',()=>{});
 subscriptions[0].onSnapshot(snapshot([180]));feed.unsubscribeBars('a');await tick();assert.equal(got.length,0);assert.equal(subscriptions[0].stopped,true);
 subscriptions[0].onSnapshot(snapshot([240],1000001));assert.equal(session.read(symbol,'1').candles.at(-1).time,180);
 feed.subscribeBars({ticker:'BINANCE:BTCUSDT'},'1',b=>got.push(b),'b',()=>{});subscriptions[1].onSnapshot(snapshot([300]));await tick();assert.equal(got.length,1);assert.equal(session.read(symbol,'1').candles.at(-1).time,180);feed.dispose();
});
test('Reusing subscriber ID cancels previous callback; destroying chart rejects pending history',async()=>{
 let finish;const {feed,subscriptions}=setup(()=>new Promise(resolve=>{finish=resolve;}));
 const got=[];feed.subscribeBars({ticker:symbol},'1',b=>got.push(b),'same',()=>{});feed.subscribeBars({ticker:symbol},'1',b=>got.push(b),'same',()=>{});
 subscriptions[0].onSnapshot(snapshot([60]));subscriptions[1].onSnapshot(snapshot([120]));await tick();assert.deepEqual(got.map(b=>b.time),[120000]);
 const pending=get(feed);await Promise.resolve();feed.dispose();finish(snapshot([180]));await assert.rejects(pending,/종료/);
});
test('Full product identity and source tick metadata required; no symbol alias resolution',async()=>{
 const {feed}=setup(async()=>snapshot([120]));
 const resolve=name=>new Promise((ok,fail)=>feed.resolveSymbol(name,ok,fail));
 const info=await resolve(symbol);assert.equal(info.pricescale,10);assert.equal(info.type,'futures');
 await assert.rejects(resolve('BTCUSDT.P'));
 const bad=createApexDatafeed({markets:[{...markets[0],pricescale:undefined}],source:{history:async()=>{},subscribe:()=>{}},session:createApexSession()});
 await assert.rejects(new Promise((ok,fail)=>bad.resolveSymbol(symbol,ok,fail)));
});

import {createMarketSource} from '../src/advanced/market-source.js';
test('Production API source preserves exact futures identity and obtains independent HTF histories',async()=>{
 const urls=[];const source=createMarketSource({fetchImpl:async url=>{urls.push(url);const p=new URL(url,'https://example.test').searchParams;const sec=p.get('interval')==='1h'?3600:p.get('interval')==='4h'?14400:60;return {ok:true,json:async()=>({fetchedAt:100000000,data:[[60000,'100','102','99','101','5',(60+sec)*1000-1]]})};}});
 const result=await source.history({market:{symbol:'BTCUSDT.P',dataSymbol:'BTCUSDT',type:'perpetual'},interval:'1m',from:60,to:120,countBack:1});
 assert.equal(urls.length,3);assert.ok(urls.every(u=>u.includes('asset=perpetual')&&u.includes('symbol=BTCUSDT&')));assert.equal(result.h1[0].closeTime,3659999);assert.equal(result.h4[0].closeTime,14459999);
 await assert.rejects(source.history({market:{symbol:'BTCUSDT',type:'crypto'},interval:'1m',from:1,to:30,countBack:1}),/HISTORY_RANGE_UNAVAILABLE/);
});
test('Production source rejects region blocks and never substitutes spot; stops in-flight polling',async()=>{
 const failed=createMarketSource({fetchImpl:async()=>({ok:false,status:451,json:async()=>({error:'FUTURES_ACCESS_RESTRICTED'})})});
 await assert.rejects(failed.history({market:{symbol:'BTCUSDT',type:'perpetual'},interval:'4h',from:1,to:999,countBack:1}),/FUTURES_ACCESS_RESTRICTED/);
 let finish,cleared=false;const events=[];const source=createMarketSource({fetchImpl:()=>new Promise(resolve=>{finish=resolve;}),setTimer:()=>123,clearTimer:id=>{assert.equal(id,123);cleared=true;}});
 const stop=source.subscribe({market:{symbol:'BTCUSDT',type:'crypto'},interval:'4h',onSnapshot:e=>events.push(e),onError:e=>events.push(e)});stop();
 finish({ok:true,json:async()=>({fetchedAt:100000,data:[[60000,100,102,99,101,5,99999]]})});await tick();assert.equal(events.length,0);assert.equal(cleared,true);
});
test('US stock daily bars normalize to UTC midnight while preserving actual close time',async()=>{
 const open=Date.UTC(2026,9,22,13,30)/1000,close=Date.UTC(2026,9,22,20)-1;
 const source=createMarketSource({fetchImpl:async()=>({ok:true,json:async()=>({normalized:true,meta:{fetchedAt:close+1000},data:[{time:open,open:80,high:86,low:79,close:85,volume:1000,closeTime:close}]})})});
 const result=await source.history({market:{symbol:'SOXL',type:'stock'},interval:'1d',from:open-86400,to:open+86400,countBack:1});
 assert.equal(result.candles[0].time,Date.UTC(2026,9,22)/1000);assert.equal(result.candles[0].closeTime,close);assert.equal(result.h1.length,0);
});
test('Corrected historical candles request chart cache reset instead of a backwards realtime update',async()=>{
 const {feed,session,subscriptions}=setup(async()=>snapshot([120,180]));await get(feed,120,240,2);
 let resets=0;const updates=[];feed.subscribeBars({ticker:symbol},'1',b=>updates.push(b),'correction',()=>resets++);
 const changed=snapshot([120,180],1000001);changed.candles[0].close=100;
 subscriptions[0].onSnapshot(changed);await tick();assert.equal(resets,1);assert.equal(updates.length,0);assert.equal(session.read(symbol,'1').candles[0].close,100);feed.dispose();
});
