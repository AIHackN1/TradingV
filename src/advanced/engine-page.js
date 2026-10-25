import {createApexSession} from './apex-session.js';
import {createApexDatafeed} from './datafeed.js';
import {createMarketSource} from './market-source.js';
import {startApexChart} from './start-chart.js';
const $=id=>document.getElementById(id);
let active,controller,generation=0;
const status=message=>{$('status').textContent=message;};
async function connect(){
 const current=++generation;controller?.abort();active?.destroy();active=null;
 controller=new AbortController();const signal=controller.signal;
 $('connect').disabled=true;
 try{
  status('배포 설정 확인 중…');
  const response=await fetch('/chart-engine.json',{signal,cache:'no-store'});
  if(!response.ok)throw new Error('정식 엔진 설치 전입니다. 승인된 라이브러리와 /chart-engine.json 설정이 필요합니다. 현재 워크스페이스는 위 링크에서 사용할 수 있습니다.');
  const config=await response.json();
  if(config.version!==1||!Array.isArray(config.markets)||!config.markets.length)throw new Error('chart-engine.json의 version:1 및 markets가 필요합니다.');
  const markets=config.markets;
  for(const m of markets){if(!m.tvSymbol||!m.symbol||!m.name||!['stock','crypto','perpetual'].includes(m.type)||!Number.isInteger(m.pricescale)||m.pricescale<=0||!Number.isInteger(m.minmov)||m.minmov<=0)throw new Error('공급자가 확인한 정확한 상품명·pricescale·minmov를 설정하세요.');}
  const previous=$('market').value;
  $('market').replaceChildren(...markets.map(m=>new Option(m.name+' · '+m.tvSymbol,m.tvSymbol)));
  $('market').disabled=false;
  if(markets.some(m=>m.tvSymbol===previous))$('market').value=previous;
  const selected=markets.find(m=>m.tvSymbol===$('market').value);
  if(selected.type==='stock')$('resolution').value='1D';
  status('정식 엔진 로드 중…');
  const session=createApexSession();
  const datafeed=createApexDatafeed({markets,session,source:createMarketSource(),onError:error=>{if(current===generation)status('시세 연결 오류: '+(error.message||error));}});
  try{
   const mounted=await startApexChart({container:'nativeChart',datafeed,session,symbol:selected.tvSymbol,resolution:$('resolution').value,signal});
   if(current!==generation){mounted.destroy();return;}
   active=mounted;status('정식 차트 초기화 완료 · APEX 부분 이식. 시세 오류는 별도 표시됩니다. 네이티브 알람 등록·그림 저장 연결은 준비 중입니다.');
  }catch(error){datafeed.dispose();throw error;}
 }catch(error){if(!signal.aborted&&current===generation)status(error.message||String(error));}
 finally{if(current===generation)$('connect').disabled=false;}
}
$('connect').onclick=connect;$('market').onchange=connect;$('resolution').onchange=connect;
window.addEventListener('pagehide',()=>{++generation;controller?.abort();active?.destroy();});
connect();
