import {createApexStudy,parseApexInputs} from './apex-study.js';
import {evaluateRule} from '../engine.js';

const resolutions=new Set(['1','5','15','60','240','1D']);
const key=(symbol,resolution)=>JSON.stringify([symbol,resolution]);
function copyCandles(rows){
  if(!Array.isArray(rows))throw new Error('캔들 배열이 필요합니다.');
  return Object.freeze(rows.map((row,i)=>{
    const c=Object.fromEntries(['time','open','high','low','close','volume','closeTime'].map(k=>[k,row[k]]));
    if(!Object.values(c).every(Number.isFinite)||c.time<=0||c.volume<0||c.closeTime<c.time*1000||c.high<Math.max(c.open,c.close,c.low)||c.low>Math.min(c.open,c.close)||i>0&&rows[i-1].time>=c.time)throw new Error('시세 시간순서·OHLC·거래량을 확인하세요.');
    return Object.freeze(c);
  }));
}

// A session belongs to ONE mounted chart. Keys retain the full exchange/product
// identity (e.g. BINANCE:BTCUSDT.P versus BINANCE:BTCUSDT), never an alias.
export function createApexSession(){
  const snapshots=new Map();
  return {
    publish({symbol,resolution,candles,h1=[],h4=[],observedAt}){
      if(typeof symbol!=='string'||!symbol||!resolutions.has(resolution)||!Number.isFinite(observedAt))throw new Error('정확한 종목·시간봉·공급자 시각이 필요합니다.');
      const id=key(symbol,resolution),previous=snapshots.get(id);
      if(previous&&observedAt<previous.observedAt)throw new Error('늦게 도착한 이전 시세 응답입니다.');
      const snapshot=Object.freeze({symbol,resolution,candles:copyCandles(candles),h1:copyCandles(h1),h4:copyCandles(h4),observedAt});
      snapshots.set(id,snapshot);
      return snapshot;
    },
    read:(symbol,resolution)=>snapshots.get(key(symbol,resolution)),
    clear:(symbol,resolution)=>snapshots.delete(key(symbol,resolution)),
    customIndicatorsGetter(PineJS){return Promise.resolve([createApexStudy(PineJS,(symbol,resolution)=>snapshots.get(key(symbol,resolution)))]);},
    evaluateAlarm(rule,{symbol,resolution}){
      const intervals={'1':'1m','5':'5m','15':'15m','60':'1h','240':'4h','1D':'1d'};
      if(rule.interval!==intervals[resolution]||rule.nativeSymbol!==symbol||rule.kind!=='apex-signal')throw new Error('알람의 종목·시간봉·지표가 차트와 다릅니다.');
      const snapshot=snapshots.get(key(symbol,resolution));
      if(!snapshot)return {rule,events:[]};
      return evaluateRule(rule,snapshot.candles,snapshot.observedAt,{h1:snapshot.h1,h4:snapshot.h4,hour:Math.floor(snapshot.observedAt/3600000)});
    },
    // Snapshot settings at explicit registration. Chart visibility/style changes
    // must not silently modify an existing rule, nor emit historical alerts.
    signalSettingsFromInputs:input=>parseApexInputs(input).signalSettings,
  };
}
