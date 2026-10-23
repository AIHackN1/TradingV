export const FUTURES_SYMBOLS=['SOXLUSDT','BTCUSDT','ETHUSDT'];
export const MARKETS = [
  ...FUTURES_SYMBOLS.map(pair=>({symbol:pair+'.P',dataSymbol:pair,code:pair.slice(0,-4),name:'USDT 무기한 선물',color:pair==='BTCUSDT'?'#f6ae42':pair==='ETHUSDT'?'#9f9fff':'#80b2ff',type:'perpetual',exchange:'BINANCE',currency:'USDT',tvSymbol:'BINANCE:'+pair+'.P'})),
  {symbol:'SOXL',name:'Semiconductor Bull 3X',code:'SOXL',color:'#80b2ff',type:'stock',currency:'USD',tvSymbol:'AMEX:SOXL'},
  ...[['BTC','Bitcoin','#f6ae42'],['ETH','Ethereum','#9f9fff'],['SOL','Solana','#70dbbb'],['XRP','XRP','#cad1de'],['BNB','BNB','#eac664'],['DOGE','Dogecoin','#cfb66f'],['AVAX','Avalanche','#ee7781'],['LINK','Chainlink','#81aaff']].map(([code,name,color])=>({symbol:code+'USDT',code,name,color,type:'crypto',tvSymbol:'BINANCE:'+code+'USDT'})),
];
export function validateMarket(input){
  const type=input.type==='stock'?'stock':input.type==='perpetual'?'perpetual':'crypto';let symbol=String(input.symbol||'').trim().toUpperCase();
  if(type==='perpetual'){const pair=symbol.replace(/\.P$/,'');if(!FUTURES_SYMBOLS.includes(pair))throw new Error('선물은 SOXLUSDT.P, BTCUSDT.P, ETHUSDT.P만 지원합니다.');return {...MARKETS.find(m=>m.symbol===pair+'.P')};}
  if(type==='crypto'&&!symbol.endsWith('USDT'))symbol+='USDT';
  if(!(type==='stock'?/^[A-Z][A-Z0-9.-]{0,14}$/:/^[A-Z0-9]{2,20}USDT$/).test(symbol))throw new Error('미국 주식 티커 또는 Binance 현물 USDT 종목을 입력하세요.');
  const exchange=type==='stock'?String(input.exchange||'NASDAQ').toUpperCase():'BINANCE';
  if(!['NASDAQ','NYSE','AMEX','BINANCE'].includes(exchange)||type==='stock'&&exchange==='BINANCE')throw new Error('지원하지 않는 거래소입니다.');
  return {symbol,type,code:type==='stock'?symbol:symbol.slice(0,-4),name:String(input.name||symbol).slice(0,60),color:'#bda5fc',currency:type==='stock'?'USD':'USDT',tvSymbol:exchange+':'+symbol,exchange};
}
export function registerMarket(input){const m=validateMarket(input);if(MARKETS.some(x=>x.symbol===m.symbol))throw new Error('이미 관심종목에 있습니다.');MARKETS.push(m);return m;}
