import test from 'node:test';
import assert from 'node:assert/strict';
import {createApexStudy,parseApexInputs,calculateNativeApex,APEX_INPUTS} from '../src/advanced/apex-study.js';
import {createApexSession} from '../src/advanced/apex-session.js';
import {mountApexChart} from '../src/advanced/mount-chart.js';
import {ema} from '../src/technical.js';
const base=1704844800;
function fixture(){
 const candles=Array.from({length:80},(_,i)=>({time:base+i*900,closeTime:(base+(i+1)*900)*1000-1,open:100,high:101,low:99,close:100,volume:10}));
 for(const [i,low,volume] of [[59,94,1000],[63,90,2000],[72,86,4000]])Object.assign(candles[i],{open:99.5,high:102,low,close:101,volume});
 const htf=seconds=>Array.from({length:260},(_,i)=>({time:base+(i-200)*seconds,closeTime:(base+(i-199)*seconds)*1000-1,open:100+i,high:101+i,low:99+i,close:100+i,volume:10}));
 return {symbol:'BINANCE:BTCUSDT.P',resolution:'15',candles,h1:htf(3600),h4:htf(14400),observedAt:candles.at(-1).closeTime+1};
}
const input=(patch={})=>i=>patch[APEX_INPUTS[i].id]??APEX_INPUTS[i].defval;
const permissive=input({minScore:0,chopMax:100,gapAtr:0});
const pine={Std:{ticker:c=>c.ticker,period:c=>c.resolution}};
test('Native study uses eight original cloud periods and exposes editable settings and fills',()=>{
 const f=fixture(),rows=calculateNativeApex(f,parseApexInputs(input()));
 assert.deepEqual(rows.get(f.candles.at(-1).time*1000).slice(0,8),[144,155,89,100,55,65,34,40].map(p=>ema(f.candles.map(c=>c.close),p).at(-1)));
 const study=createApexStudy(pine,()=>f);assert.equal(study.metainfo.inputs.length,13);assert.equal(study.metainfo.filledAreas.length,4);
 assert.throws(()=>parseApexInputs(input({ema0:-1})));assert.throws(()=>parseApexInputs(input({cloudTimeframe:'bad'})));
});
test('HTF cloud reads only the previous confirmed HTF bar, even with future history loaded',()=>{
 const f=fixture(),settings=parseApexInputs(input({cloudTimeframe:'레짐 TF1 (1h)'}));
 const t=f.candles[10].time,first=calculateNativeApex(f,settings).get(t*1000);
 for(const c of f.h1)if(c.closeTime>=t*1000)c.close=100000;
 assert.deepEqual(calculateNativeApex(f,settings).get(t*1000),first);
 assert.ok(calculateNativeApex({...f,h1:[]},settings).get(t*1000).slice(0,8).every(Number.isNaN));
});
test('Chart markers and repeated alarms use identical confirmed bars; no redraw alert side effects',()=>{
 const f=fixture(),session=createApexSession();session.publish(f);
 const study=createApexStudy(pine,session.read),instance=new study.constructor();instance.init();
 const markers=f.candles.filter(c=>instance.main({ticker:f.symbol,resolution:f.resolution,symbol:{time:c.time*1000}},permissive)[8]===1).map(c=>c.time);
 assert.deepEqual(markers,[f.candles[59].time,f.candles[72].time]);
 const rule={id:'native',symbol:'BTCUSDT.P',nativeSymbol:f.symbol,interval:'15m',kind:'apex-signal',signalSettings:session.signalSettingsFromInputs(permissive),enabled:true,once:false,lastEvaluated:f.candles[58].time};
 const done=session.evaluateAlarm(rule,f);assert.deepEqual(done.events.map(e=>e.barTime),markers);
 assert.equal(session.evaluateAlarm(done.rule,f).events.length,0);
 assert.throws(()=>session.evaluateAlarm({...rule,nativeSymbol:'BINANCE:BTCUSDT'},f));
 // A later input change updates native results, but the registered alarm keeps its snapshot.
 assert.ok(Number.isNaN(instance.main({ticker:f.symbol,resolution:'15',symbol:{time:f.candles[59].time*1000}},input({minScore:100}))[8]));
 assert.equal(rule.signalSettings.minScore,0);
});
test('Incomplete candle is absent from both native marker and alarm despite future data in memory',()=>{
 const f=fixture();f.observedAt=f.candles[59].closeTime;
 const s=createApexSession(),snapshot=s.publish(f),row=calculateNativeApex(snapshot,parseApexInputs(permissive)).get(f.candles[59].time*1000);
 assert.ok(Number.isNaN(row[8]));
 const r={id:'r',nativeSymbol:f.symbol,interval:'15m',kind:'apex-signal',enabled:true,lastEvaluated:f.candles[58].time,signalSettings:parseApexInputs(permissive).signalSettings};
 assert.equal(s.evaluateAlarm(r,f).events.length,0);
});
test('Sessions preserve product identity, reject stale/corrupt responses and isolate mutation',()=>{
 const f=fixture(),s=createApexSession(),saved=s.publish(f);f.candles[0].close=1234;
 assert.equal(saved.candles[0].close,100);assert.equal(s.read('BINANCE:BTCUSDT','15'),undefined);assert.equal(s.read(f.symbol,'60'),undefined);
 assert.throws(()=>s.publish({...fixture(),observedAt:saved.observedAt-1}));
 assert.throws(()=>s.publish(f));
 const study=createApexStudy(pine,s.read),instance=new study.constructor();instance.init();
 assert.ok(instance.main({ticker:'AMEX:SOXL',resolution:'1D',symbol:{time:base*1000}},input()).every(Number.isNaN));
 s.clear(f.symbol,'15');assert.equal(s.read(f.symbol,'15'),undefined);
});
test('Native mount requires real library/datafeed and wires the study into the same chart',async()=>{
 assert.throws(()=>mountApexChart({}),/라이브러리/);
 let options,studyName,removed=false;
 class MockWidget{constructor(o){options=o;}onChartReady(cb){queueMicrotask(cb);}activeChart(){return {createStudy:async name=>{studyName=name;return 'study-1';}};}remove(){removed=true;}}
 const datafeed=Object.fromEntries(['onReady','searchSymbols','resolveSymbol','getBars','subscribeBars','unsubscribeBars'].map(k=>[k,()=>{}]));
 const mounted=mountApexChart({Widget:MockWidget,container:'chart',datafeed,session:createApexSession(),symbol:'BINANCE:BTCUSDT.P'});
 assert.equal(await mounted.ready,'study-1');assert.equal(options.datafeed,datafeed);assert.equal((await options.custom_indicators_getter(pine))[0].name,studyName);
 assert.ok(!options.disabled_features.includes('left_toolbar'));mounted.destroy();assert.equal(removed,true);
});
