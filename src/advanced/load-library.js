// Load only the deployment's own, officially obtained Charting Library files.
// This does not grant a license or use TradingView's hosted widget as an engine.
const pending = new WeakMap();
export function loadChartingLibrary({document:doc=globalThis.document,window:win=globalThis.window,timeoutMs=15000}={}) {
  if(!doc||!win)return Promise.reject(new Error('브라우저 환경이 필요합니다.'));
  if(typeof win.TradingView?.widget==='function')return Promise.resolve(win.TradingView.widget);
  if(pending.has(doc))return pending.get(doc);
  const promise=new Promise((resolve,reject)=>{
    const script=doc.createElement('script');
    script.src='/charting_library/charting_library.standalone.js';
    script.async=true;
    const finish=(error)=>{
      clearTimeout(timer);script.onload=null;script.onerror=null;
      if(error){script.remove();reject(error);}
      else resolve(win.TradingView.widget);
    };
    const timer=setTimeout(()=>finish(new Error('정식 차트 엔진 로딩 시간이 초과되었습니다.')),timeoutMs);
    script.onload=()=>finish(typeof win.TradingView?.widget==='function'?null:new Error('정식 차트 엔진 파일이 없거나 올바른 생성자를 제공하지 않습니다.'));
    script.onerror=()=>finish(new Error('정식 차트 엔진 파일을 불러오지 못했습니다. 승인된 라이브러리를 배포해야 합니다.'));
    doc.head.append(script);
  });
  pending.set(doc,promise);
  promise.catch(()=>{if(pending.get(doc)===promise)pending.delete(doc);});
  return promise;
}
