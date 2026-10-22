// Public Yahoo Finance chart response adapter. This is a delayed/EOD feed, not TradingView data.
const nyDate=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t*1000));
export function normalizeStockResponse(payload){
  const r=payload?.chart?.result?.[0];if(!r?.timestamp?.length||!r.indicators?.quote?.[0])throw new Error('SOXL 시세 응답이 비어 있습니다.');
  const q=r.indicators.quote[0],session=r.meta.currentTradingPeriod?.regular;
  const candles=r.timestamp.map((time,i)=>({time,open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume[i],closeTime:((session&&nyDate(time)===nyDate(session.start))?session.end:time+6.5*3600)*1000-1})).filter(c=>Object.values(c).every(Number.isFinite)&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close));
  if(!candles.length)throw new Error('유효한 SOXL 봉이 없습니다.');
  return {candles:candles.slice(-1000),quote:{symbol:'SOXL',lastPrice:r.meta.regularMarketPrice??candles.at(-1).close,priceChangePercent:candles.length>1?((r.meta.regularMarketPrice??candles.at(-1).close)/candles.at(-2).close-1)*100:null,highPrice:r.meta.regularMarketDayHigh,lowPrice:r.meta.regularMarketDayLow,quoteVolume:null},meta:{provider:'Yahoo Finance',currency:r.meta.currency||'USD',exchangeTimezone:r.meta.exchangeTimezoneName||'America/New_York',delay:'지연 가능 · 정규장 일봉',lastBarTime:candles.at(-1).time,fetchedAt:Date.now()}};
}
export function parseChartCsv(text,intervalSeconds=86400){
  const lines=text.trim().split(/\r?\n/);if(lines.length<3)throw new Error('헤더와 최소 2개 봉이 필요합니다.');
  const split=line=>line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s=>s.replace(/^"|"$/g,'').trim());
  const columns=split(lines[0]).map(s=>s.toLowerCase().replace(/^\ufeff/,''));
  const get=(names)=>columns.findIndex(c=>names.includes(c));const idx={time:get(['time','date','datetime','timestamp']),open:get(['open']),high:get(['high']),low:get(['low']),close:get(['close']),volume:get(['volume','vol'])};
  if(['time','open','high','low','close'].some(k=>idx[k]<0))throw new Error('time/date, open, high, low, close 열이 필요합니다.');
  const candles=lines.slice(1).filter(l=>l.trim()).map(line=>{const a=split(line),raw=a[idx.time];let time=Number(raw);if(Number.isFinite(time)&&raw.trim()){if(time>1e12)time/=1000;}else{const iso=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+'T00:00:00Z':raw;if(!/Z$|[+-]\d{2}:?\d{2}$/.test(iso))throw new Error('시간에는 Z 또는 UTC 오프셋이 필요합니다.');time=Date.parse(iso)/1000;}const candle={time,open:Number(a[idx.open]),high:Number(a[idx.high]),low:Number(a[idx.low]),close:Number(a[idx.close]),volume:idx.volume<0?0:Number(a[idx.volume]),closeTime:(time+intervalSeconds)*1000-1};if(Object.values(candle).some(v=>!Number.isFinite(v))||time<=0||candle.high<Math.max(candle.open,candle.close)||candle.low>Math.min(candle.open,candle.close)||candle.volume<0)throw new Error('유효하지 않은 봉이 포함되어 있습니다.');return candle;});
  candles.sort((a,b)=>a.time-b.time);if(candles.some((c,i)=>i&&c.time===candles[i-1].time))throw new Error('중복된 봉 시간이 있습니다.');return candles.slice(-10000);
}
