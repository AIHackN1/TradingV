// Receipt of an old response is not evidence that its final bar was closed.
// Keep this metadata off JSON/array iteration so chart API candle formats stay
// unchanged. Live websocket events may advance it with the exchange event time.
export function observeCandles(candles,observedAt){
  if(observedAt==null)return candles;
  if(!Number.isFinite(observedAt)||observedAt<=0)throw new Error('유효한 시세 조회 시각이 필요합니다.');
  Object.defineProperty(candles,'observedAt',{value:observedAt,writable:true,configurable:true,enumerable:false});
  return candles;
}
export function candleCutoff(candles,now=Date.now()){
  return Number.isFinite(candles.observedAt)?Math.min(now,candles.observedAt):now;
}
