import {normalizeKlines} from '../engine.js';

// Production public API source. Current endpoint supplies the latest 1,000
// crypto bars / Yahoo 5y daily history. It does NOT support arbitrary pagination.
export function createMarketSource({fetchImpl=fetch,pollMs=15000,setTimer=setInterval,clearTimer=clearInterval}={}){
  async function load(market,interval,signal){
    const params=new URLSearchParams({kind:'klines',symbol:market.dataSymbol||market.symbol,interval,asset:market.type});
    const response=await fetchImpl(`/api/market?${params}`,{signal});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||body.code||`시세 HTTP ${response.status}`);
    const observedAt=body.fetchedAt??body.meta?.fetchedAt;
    if(!Number.isFinite(observedAt))throw new Error('공급자 수신 시각이 없는 응답입니다.');
    const candles=body.normalized?body.data:normalizeKlines(body.data);
    if(!Array.isArray(candles))throw new Error('시세 캔들이 없습니다.');
    // Advanced Charts requires daily timestamps at UTC midnight. Preserve the
    // source closeTime (actual US trading session close), not midnight + 24h.
    const normalized=market.type==='stock'?candles.map(c=>({...c,time:Math.floor(c.time/86400)*86400})):candles;
    return {candles:normalized,observedAt};
  }
  async function snapshot(market,interval,signal){
    const needed=market.type!=='stock'&&['1m','5m','15m','1h'].includes(interval);
    const [main,h1,h4]=await Promise.all([
      load(market,interval,signal),needed&&interval!=='1h'?load(market,'1h',signal):null,needed?load(market,'4h',signal):null,
    ]);
    const one=needed?(interval==='1h'?main:h1):null;
    return {...main,h1:one?.candles||[],h4:h4?.candles||[],
      observedAt:Math.min(main.observedAt,one?.observedAt??Infinity,h4?.observedAt??Infinity)};
  }
  return {
    async history({market,interval,from,to,countBack}){
      const result=await snapshot(market,interval,AbortSignal.timeout(12000));
      const eligible=result.candles.filter(c=>c.time<to);
      if(!eligible.length||eligible.length<countBack&&result.candles[0]?.time>from){
        throw new Error('HISTORY_RANGE_UNAVAILABLE: 현재 공급 API의 보관 범위 밖입니다. 과거 이력 페이지네이션 연결이 필요합니다.');
      }
      return {...result,noData:false};
    },
    subscribe({market,interval,onSnapshot,onError}){
      let stopped=false,running=false,controller;
      const poll=async()=>{
        if(stopped||running)return;
        running=true;controller=new AbortController();
        try{const result=await snapshot(market,interval,AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]));if(!stopped)onSnapshot(result);}
        catch(error){if(!stopped)onError(error);}
        finally{running=false;}
      };
      const timer=setTimer(poll,market.type==='stock'?Math.max(60000,pollMs):pollMs);
      void poll();
      return ()=>{stopped=true;clearTimer(timer);controller?.abort();};
    },
  };
}
