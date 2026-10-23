export const INTERVALS={'1m':60,'5m':300,'10m':600,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400};
export const NATIVE_INTERVALS={'1':'1m','5':'5m','10':'10m','15':'15m','30':'30m','60':'1h','240':'4h','1D':'1d'};
export const FILTERED_INTERVALS=['1m','5m','10m','15m','30m','1h'];
export const providerInterval=interval=>interval==='10m'?'5m':interval;

// Binance has no native 10m kline. Join two consecutive UTC-aligned 5m
// provider rows. Never invent a missing half, nor mark the first half closed.
export function aggregateTenMinuteKlines(rows,now=Date.now()){
  if(!Array.isArray(rows))throw new Error('5분봉 배열이 필요합니다.');
  const sorted=rows.map(row=>row.slice()).sort((a,b)=>Number(a[0])-Number(b[0]));
  const buckets=new Map();
  for(const row of sorted){
    const t=Number(row[0]);
    if(!Number.isFinite(t)||t%300000!==0||Number(row[6])!==t+299999)throw new Error('유효한 UTC 5분봉이 아닙니다.');
    const start=Math.floor(t/600000)*600000;
    if(!buckets.has(start))buckets.set(start,new Map());
    const parts=buckets.get(start);if(parts.has(t))throw new Error('중복된 5분봉입니다.');parts.set(t,row);
  }
  const lastTime=sorted.length?Number(sorted.at(-1)[0]):null;
  const result=[];
  for(const [start,parts] of buckets){
    const first=parts.get(start),second=parts.get(start+300000);
    if(!first)continue; // Leading half of the fetched window is incomplete.
    if(!second&&(Number(first[0])!==lastTime||now>start+599999))throw new Error('10분봉 합산에 필요한 5분봉이 누락되었습니다.');
    const end=second||first;
    result.push([start,Number(first[1]),Math.max(Number(first[2]),Number(end[2])),Math.min(Number(first[3]),Number(end[3])),Number(end[4]),Number(first[5])+(second?Number(second[5]):0),start+599999]);
  }
  return result;
}
