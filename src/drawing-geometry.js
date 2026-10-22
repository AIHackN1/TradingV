export const DRAWING_TOOLS=['select','trend','ray','horizontal','vertical','rectangle','fib','brush','text','measure','eraser'];
export function timeAtLogical(data,logical){
  if(!data.length||!Number.isFinite(logical))return null;
  const i=Math.floor(logical),f=logical-i,step=data.length>1?data.at(-1).time-data.at(-2).time:60;
  const at=j=>j<0?data[0].time+j*step:j>=data.length?data.at(-1).time+(j-data.length+1)*step:data[j].time;
  return at(i)*(1-f)+at(i+1)*f;
}
export function logicalAtTime(data,time){
  if(!data.length||!Number.isFinite(time))return null;
  if(data.length===1)return (time-data[0].time)/60;
  if(time<=data[0].time)return (time-data[0].time)/(data[1].time-data[0].time);
  if(time>=data.at(-1).time)return data.length-1+(time-data.at(-1).time)/(data.at(-1).time-data.at(-2).time);
  let lo=0,hi=data.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(data[mid].time<=time)lo=mid;else hi=mid;}
  return lo+(time-data[lo].time)/(data[hi].time-data[lo].time);
}
export function pointSegmentDistance(p,a,b,ray=false){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  let t=len?((p.x-a.x)*dx+(p.y-a.y)*dy)/len:0;t=Math.max(0,ray?t:Math.min(1,t));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function validateDrawing(d){
  if(!d||!DRAWING_TOOLS.includes(d.type)||['select','eraser'].includes(d.type)||!Array.isArray(d.points)||!d.points.length||d.points.length>1000)throw new Error('잘못된 그리기 데이터입니다.');
  if(!/^#[0-9a-f]{6}$/i.test(d.color)||!Number.isFinite(d.width)||d.width<1||d.width>5)throw new Error('그리기 스타일이 유효하지 않습니다.');
  if(d.points.some(p=>!Number.isFinite(p.time)||p.time<=0||!Number.isFinite(p.price)))throw new Error('좌표가 유효하지 않습니다.');
  if(!['horizontal','vertical','text','brush'].includes(d.type)&&d.points.length!==2)throw new Error('두 개의 기준점이 필요합니다.');
  return {id:String(d.id||Date.now()).slice(0,100),type:d.type,color:d.color,width:d.width,points:d.points.map(p=>({time:p.time,price:p.price})),text:String(d.text||'메모').slice(0,100)};
}
