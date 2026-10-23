import {STUDY_NAME} from './apex-study.js';

// Call only with the official licensed Charting Library constructor and an
// independently authorized datafeed. No third-party library download or iframe
// injection. The host publishes its candle snapshot BEFORE feed callbacks.
export function mountApexChart({Widget,container,datafeed,session,symbol,resolution='15',libraryPath='/charting_library/'}){
  if(typeof Widget!=='function')throw new Error('정식 Advanced Charts 라이브러리가 설치되지 않았습니다. 무료 위젯으로 대체하지 않습니다.');
  for(const method of ['onReady','searchSymbols','resolveSymbol','getBars','subscribeBars','unsubscribeBars']){
    if(typeof datafeed?.[method]!=='function')throw new Error(`시세 어댑터 ${method}가 필요합니다.`);
  }
  if(!container||!symbol||typeof session?.customIndicatorsGetter!=='function')throw new Error('차트 컨테이너·종목·APEX 세션이 필요합니다.');
  const widget=new Widget({
    container,datafeed,symbol,interval:resolution,library_path:libraryPath,
    locale:'ko',theme:'dark',autosize:true,
    custom_indicators_getter:session.customIndicatorsGetter.bind(session),
    // Never hide header indicators/settings or the native drawing toolbar.
    disabled_features:['header_symbol_search'],
  });
  const ready=new Promise((resolve,reject)=>{
    widget.onChartReady(()=>{
      Promise.resolve().then(()=>widget.activeChart().createStudy(STUDY_NAME,false,false)).then(resolve,reject);
    });
  });
  return {widget,ready,destroy:()=>{try{widget.remove();}finally{datafeed.dispose?.();}}};
}
