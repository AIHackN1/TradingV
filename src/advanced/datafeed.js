// Advanced Charts datafeed boundary. The source must be authorized for the
// exact exchange/product; failures are never replaced by another instrument.
const intervals={'1':'1m','5':'5m','15':'15m','60':'1h','240':'4h','1D':'1d'};
const later=callback=>setTimeout(callback,0);
const bar=c=>({time:c.time*1000,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume});
function merge(a=[],b=[]){return [...new Map([...a,...b].map(c=>[c.time,c])).values()].sort((a,b)=>a.time-b.time);}

export function createApexDatafeed({markets,source,session,onError=()=>{}}){
  if(typeof source?.history!=='function'||typeof source?.subscribe!=='function')throw new Error('시세 이력/실시간 공급자가 필요합니다.');
  const catalog=new Map(markets.map(m=>[m.tvSymbol,{...m}])),subscriptions=new Map();
  let disposed=false;
  const marketFor=(symbol,resolution)=>{
    const m=catalog.get(symbol);
    if(!m||!intervals[resolution]||m.type==='stock'&&resolution!=='1D')throw new Error('지원하지 않는 정확한 종목/시간봉입니다.');
    return m;
  };
  const publish=(symbol,resolution,result)=>{
    if(!result||!Array.isArray(result.candles))throw new Error('시세 응답 형식이 올바르지 않습니다.');
    const old=session.read(symbol,resolution);
    // Retain earlier pages so indicator seeds never move when the viewport pans.
    return session.publish({symbol,resolution,observedAt:result.observedAt,
      candles:merge(old?.candles,result.candles),h1:merge(old?.h1,result.h1),h4:merge(old?.h4,result.h4)});
  };
  const feed={
    onReady(callback){later(()=>callback({supported_resolutions:Object.keys(intervals),supports_marks:false,supports_timescale_marks:false,supports_time:false}));},
    searchSymbols(query,exchange,type,callback){
      const text=String(query).toUpperCase();
      const results=[...catalog.values()].filter(m=>(!exchange||m.tvSymbol.startsWith(exchange+':'))&&(!type||type===(m.type==='perpetual'?'futures':m.type))&&(m.tvSymbol.toUpperCase().includes(text)||m.name.toUpperCase().includes(text))).map(m=>({symbol:m.symbol,ticker:m.tvSymbol,full_name:m.tvSymbol,description:m.name,exchange:m.tvSymbol.split(':')[0],type:m.type==='perpetual'?'futures':m.type}));
      later(()=>callback(results));
    },
    resolveSymbol(symbol,success,failure){
      const m=catalog.get(symbol);
      if(!m){later(()=>failure('unknown_symbol'));return;}
      // Tick size must come from the source metadata, not a guessed price scale.
      if(!Number.isInteger(m.pricescale)||m.pricescale<=0||!Number.isInteger(m.minmov)||m.minmov<=0){later(()=>failure('공급자의 pricescale/minmov 메타데이터가 필요합니다.'));return;}
      later(()=>success({name:m.tvSymbol,ticker:m.tvSymbol,description:m.name,type:m.type==='perpetual'?'futures':m.type,
        exchange:m.tvSymbol.split(':')[0],listed_exchange:m.tvSymbol.split(':')[0],
        session:m.type==='stock'?'0930-1600:23456':'24x7',timezone:m.type==='stock'?'America/New_York':'Etc/UTC',
        minmov:m.minmov,pricescale:m.pricescale,has_intraday:m.type!=='stock',has_daily:true,
        supported_resolutions:m.type==='stock'?['1D']:Object.keys(intervals),volume_precision:8,
        data_status:m.type==='stock'?'endofday':'streaming',format:'price'}));
    },
    getBars(info,resolution,period,success,failure){
      const symbol=info.ticker;
      Promise.resolve().then(()=>{
        if(disposed)throw new Error('차트가 종료되었습니다.');
        const market=marketFor(symbol,resolution);
        if(!Number.isFinite(period.from)||!Number.isFinite(period.to)||period.from>=period.to||!Number.isInteger(period.countBack)||period.countBack<=0)throw new Error('잘못된 이력 요청입니다.');
        return source.history({market,resolution,interval:intervals[resolution],from:period.from,to:period.to,countBack:period.countBack});
      }).then(result=>{
        if(disposed)throw new Error('차트가 종료되었습니다.');
        const snapshot=publish(symbol,resolution,result);
        const before=snapshot.candles.filter(c=>c.time<period.to);
        const inside=before.filter(c=>c.time>=period.from);
        const rows=before.slice(-Math.max(period.countBack,inside.length));
        // Absence of data due to an error is NOT end-of-history. The provider
        // must explicitly confirm exhaustion, otherwise report the gap.
        if(!rows.length&&result.noData!==true)throw new Error('이력 공급자가 빈 구간을 반환했지만 이력 종료를 확인하지 않았습니다.');
        later(()=>disposed?failure('차트가 종료되었습니다.'):success(rows.map(bar),{noData:!rows.length&&result.noData===true}));
      }).catch(error=>later(()=>failure(error.message)));
    },
    subscribeBars(info,resolution,callback,uid,resetCache){
      if(disposed)return;
      feed.unsubscribeBars(uid);
      const symbol=info.ticker,record={active:true,stop:null,lastTime:null};
      subscriptions.set(uid,record);
      try{
        const market=marketFor(symbol,resolution);
        record.stop=source.subscribe({market,resolution,interval:intervals[resolution],onSnapshot:result=>{
          if(disposed||!record.active||subscriptions.get(uid)!==record)return;
          try{
            const previous=session.read(symbol,resolution),past=new Map(previous?.candles.map(c=>[c.time,c]));
            const corrected=result.candles.some(c=>{
              const old=past.get(c.time);
              return old&&c.time<previous.candles.at(-1).time&&['open','high','low','close','volume'].some(k=>old[k]!==c[k]);
            });
            const snapshot=publish(symbol,resolution,result),latest=snapshot.candles.at(-1);
            if(!latest)return;
            if(corrected){later(()=>{if(!disposed&&record.active)resetCache();});return;}
            if(record.lastTime!==null&&latest.time<record.lastTime){later(()=>record.active&&resetCache());return;}
            record.lastTime=latest.time;
            later(()=>{if(!disposed&&record.active&&subscriptions.get(uid)===record)callback(bar(latest));});
          }catch(error){onError({symbol,resolution,error});}
        },onError:error=>{if(record.active)onError({symbol,resolution,error});}});
      }catch(error){feed.unsubscribeBars(uid);onError({symbol,resolution,error});}
    },
    unsubscribeBars(uid){const record=subscriptions.get(uid);if(!record)return;record.active=false;subscriptions.delete(uid);if(typeof record.stop==='function')record.stop();},
    dispose(){disposed=true;for(const uid of [...subscriptions.keys()])feed.unsubscribeBars(uid);},
  };
  return feed;
}
