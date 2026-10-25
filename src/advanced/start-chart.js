import {loadChartingLibrary} from './load-library.js';
import {mountApexChart} from './mount-chart.js';
// The production host may switch only after licensed assets and a working,
// authorized datafeed are provisioned. Do not replace a working chart on failure.
export async function startApexChart(options,{load=loadChartingLibrary,mount=mountApexChart}={}){
  const {signal,...chartOptions}=options;
  const abort=()=>{if(signal?.aborted)throw signal.reason||new DOMException('차트 전환 취소','AbortError');};
  abort();
  const Widget=await load();
  abort();
  const chart=mount({...chartOptions,Widget});
  let destroyed=false;
  const destroy=()=>{if(!destroyed){destroyed=true;signal?.removeEventListener('abort',destroy);chart.destroy();}};
  signal?.addEventListener('abort',destroy,{once:true});
  try{await chart.ready;abort();return {...chart,destroy};}
  catch(error){destroy();throw error;}
}
