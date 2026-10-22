import {normalizeStockResponse} from '../src/stock-data.js';
const defaults=['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT'];
const crypto=/^[A-Z0-9]{2,20}USDT$/,stock=/^[A-Z][A-Z0-9.-]{0,14}$/;
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const {kind='klines',symbol='BTCUSDT',interval='15m',asset}=req.query;
 const isStock=asset==='stock'||symbol==='SOXL';
 if(typeof symbol!=='string'||!['klines','ticker','check'].includes(kind)||!(isStock?stock:crypto).test(symbol)||!['1m','5m','15m','1h','4h','1d'].includes(interval))return res.status(400).json({error:'Invalid market query'});
 if(isStock){
  if(interval!=='1d')return res.status(400).json({error:'자체 미국 주식 분석·알람은 정규장 일봉만 지원합니다.'});
  try{const upstream=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.replace('.','-'))}?interval=1d&range=5y&includePrePost=false`,{signal:AbortSignal.timeout(8000)});
   if(!upstream.ok)throw new Error('Upstream '+upstream.status);
   const data=normalizeStockResponse(await upstream.json(),symbol);res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
   return res.status(200).json({...data,data:kind==='klines'?data.candles:[data.quote],normalized:true});
  }catch{return res.status(502).json({error:`${symbol} 일봉 확인 실패. 티커와 제공자 상태를 확인하세요. 실패한 종목은 저장하지 않습니다.`});}
 }
 let list=defaults;
 if(req.query.symbols){try{list=JSON.parse(req.query.symbols);if(!Array.isArray(list)||!list.length||list.length>50||list.some(s=>typeof s!=='string'||!crypto.test(s)))throw new Error();}catch{return res.status(400).json({error:'Invalid ticker list'});}}
 const path=kind==='klines'?'klines':'ticker/24hr';const params=kind==='klines'?new URLSearchParams({symbol,interval,limit:'1000'}):kind==='check'?new URLSearchParams({symbol}):new URLSearchParams({symbols:JSON.stringify(list)});
 try{const upstream=await fetch(`https://data-api.binance.vision/api/v3/${path}?${params}`,{signal:AbortSignal.timeout(9000)});if(!upstream.ok)throw new Error();const data=await upstream.json();res.setHeader('Cache-Control','public, s-maxage=3, stale-while-revalidate=3');return res.status(200).json({provider:'Binance Spot',fetchedAt:Date.now(),data:kind==='check'?[data]:data});}
 catch{return res.status(502).json({error:'Binance 현물 시세 확인 실패. USDT 페어와 거래소 상태를 확인하세요.'});}
}
