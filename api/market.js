import {normalizeStockResponse} from '../src/stock-data.js';
const symbols=['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT'];
const intervals=['1m','5m','15m','1h','4h','1d'];
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const {kind='klines',symbol='BTCUSDT',interval='15m'}=req.query;
  if(!['klines','ticker'].includes(kind)||(!symbols.includes(symbol)&&symbol!=='SOXL')||!intervals.includes(interval))return res.status(400).json({error:'Invalid market query'});
  if(symbol==='SOXL'){
    if(interval!=='1d')return res.status(400).json({error:'SOXL 자체 분석은 정규장 일봉만 지원합니다. 분봉은 TradingView 보기에서 선택하세요.'});
    try{
      const upstream=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/SOXL?interval=1d&range=5y&includePrePost=false',{signal:AbortSignal.timeout(8000)});
      if(!upstream.ok)throw new Error('Upstream '+upstream.status);
      const data=normalizeStockResponse(await upstream.json());res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
      return res.status(200).json({...data,data:kind==='ticker'?[data.quote]:data.candles,normalized:true});
    }catch{return res.status(502).json({error:'SOXL 일봉 제공자에 연결하지 못했습니다. TradingView 보기 또는 CSV 가져오기를 이용하세요.'});}
  }
  const params=kind==='ticker'?new URLSearchParams({symbols:JSON.stringify(symbols)}):new URLSearchParams({symbol,interval,limit:'1000'});
  try{
    const upstream=await fetch(`https://data-api.binance.vision/api/v3/${kind==='ticker'?'ticker/24hr':'klines'}?${params}`,{signal:AbortSignal.timeout(9000)});
    if(!upstream.ok)throw new Error('Market provider returned '+upstream.status);
    const data=await upstream.json();res.setHeader('Cache-Control','public, s-maxage=3, stale-while-revalidate=3');return res.status(200).json({provider:'Binance Spot',fetchedAt:Date.now(),data});
  }catch{return res.status(502).json({error:'거래소 시세에 연결하지 못했습니다. 잠시 후 다시 시도하세요.'});}
}
