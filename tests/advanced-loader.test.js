import test from 'node:test';
import assert from 'node:assert/strict';
import {loadChartingLibrary} from '../src/advanced/load-library.js';
import {startApexChart} from '../src/advanced/start-chart.js';
function browser(){const scripts=[];const win={};const doc={createElement:()=>({remove(){this.removed=true;}}),head:{append:s=>scripts.push(s)}};return {doc,win,scripts};}
test('native engine loader shares requests, requires a constructor, retries missing assets',async()=>{
 const {doc,win,scripts}=browser();const a=loadChartingLibrary({document:doc,window:win});
 assert.equal(loadChartingLibrary({document:doc,window:win}),a);assert.equal(scripts.length,1);
 assert.equal(scripts[0].src,'/charting_library/charting_library.standalone.js');
 scripts[0].onload();await assert.rejects(a,/生成|생성자/);assert.equal(scripts[0].removed,true);
 const b=loadChartingLibrary({document:doc,window:win});win.TradingView={widget:function Widget(){}};scripts[1].onload();
 assert.equal(await b,win.TradingView.widget);
});
test('native engine loader reports timeout and permits retry',async()=>{
 const {doc,win,scripts}=browser();await assert.rejects(loadChartingLibrary({document:doc,window:win,timeoutMs:1}),/초과/);assert.equal(scripts[0].removed,true);
 const retry=loadChartingLibrary({document:doc,window:win});scripts[1].onerror();await assert.rejects(retry,/배포/);
});
test('cancelled engine load never mounts an obsolete chart',async()=>{
 const c=new AbortController();let release,mounts=0;const task=startApexChart({signal:c.signal},{load:()=>new Promise(r=>release=r),mount:()=>mounts++});c.abort();release(()=>{});await assert.rejects(task);assert.equal(mounts,0);
});
test('failed native study initialization destroys widget and datafeed once',async()=>{
 let destroyed=0;await assert.rejects(startApexChart({}, {load:async()=>()=>{},mount:()=>({ready:Promise.reject(new Error('study failed')),destroy:()=>destroyed++})}),/study failed/);assert.equal(destroyed,1);
});
