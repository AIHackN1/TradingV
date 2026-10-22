import {timeAtLogical,logicalAtTime,pointSegmentDistance,validateDrawing} from './drawing-geometry.js';
export class DrawingLayer{
  constructor({chart,series,container,getCandles,onSave,onChange,onText}){
    Object.assign(this,{chart,series,container,getCandles,onSave,onChange,onText});this.items=[];this.tool='select';this.color='#c3a5ff';this.width=2;this.visible=true;this.selected=null;this.past=[];this.future=[];
    this.view={zOrder:()=> 'top',renderer:()=>({draw:t=>this.render(t)})};
    this.primitive={attached:p=>{this.requestUpdate=p.requestUpdate;},detached:()=>{},updateAllViews:()=>{},paneViews:()=>[this.view]};
    series.attachPrimitive(this.primitive);
    container.addEventListener('pointerdown',e=>this.down(e),true);
    container.addEventListener('pointermove',e=>this.move(e),true);
    container.addEventListener('pointerup',e=>this.up(e),true);
    container.addEventListener('pointercancel',()=>this.cancel());
    // Lightweight Charts also handles mouse/touch events. Prevent double interaction only while drawing/dragging.
    for(const ev of ['mousedown','touchstart','dblclick'])container.addEventListener(ev,e=>{if(this.tool!=='select'||this.dragging){e.preventDefault();e.stopImmediatePropagation();}}, {capture:true,passive:false});
    document.addEventListener('keydown',e=>{
      if(e.target.closest('input,textarea,select,dialog')||container.closest('[hidden]'))return;
      if(e.key==='Escape'){this.cancel();this.setTool('select');}
      if((e.key==='Delete'||e.key==='Backspace')&&this.selected){e.preventDefault();this.removeSelected();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();}
    });
  }
  snapshot(){this.past.push(JSON.stringify(this.items));if(this.past.length>60)this.past.shift();this.future=[];}
  commit(){this.onSave(this.items);this.notify();}
  notify(){this.requestUpdate?.();this.onChange?.({count:this.items.length,selected:this.selected,tool:this.tool,undo:this.past.length>0,redo:this.future.length>0,visible:this.visible});}
  load(items){this.items=[];for(const d of items||[])try{this.items.push(validateDrawing(d));}catch{}this.selected=null;this.past=[];this.future=[];this.draft=null;this.notify();}
  setTool(tool){this.cancel();this.tool=tool;this.container.style.cursor=tool==='select'?'default':tool==='eraser'?'not-allowed':'crosshair';this.container.style.touchAction=tool==='select'?'auto':'none';this.chart.applyOptions({handleScroll:tool==='select',handleScale:tool==='select'});this.notify();}
  setVisible(v){this.visible=v;this.notify();}
  undo(){if(!this.past.length)return;this.future.push(JSON.stringify(this.items));this.items=JSON.parse(this.past.pop());this.selected=null;this.commit();}
  redo(){if(!this.future.length)return;this.past.push(JSON.stringify(this.items));this.items=JSON.parse(this.future.pop());this.selected=null;this.commit();}
  removeSelected(){if(!this.selected)return;this.snapshot();this.items=this.items.filter(i=>i.id!==this.selected);this.selected=null;this.commit();}
  clear(){if(!this.items.length)return;this.snapshot();this.items=[];this.selected=null;this.commit();}
  point(e){const r=this.container.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top,{width,height}=this.chart.paneSize();if(x<0||x>width||y<0||y>height)return null;const logical=this.chart.timeScale().coordinateToLogical(x),price=this.series.coordinateToPrice(y);if(logical===null||price===null)return null;const time=timeAtLogical(this.getCandles(),logical);return time===null?null:{time,price};}
  xy(p){const logical=logicalAtTime(this.getCandles(),p.time);const x=logical===null?null:this.chart.timeScale().logicalToCoordinate(logical),y=this.series.priceToCoordinate(p.price);return x===null||y===null?null:{x,y};}
  hit(p){if(!this.visible)return null;const q=this.xy(p);if(!q)return null;for(const d of this.items.slice().reverse()){
    const a=this.xy(d.points[0]),b=this.xy(d.points.at(-1));if(!a||!b)continue;
    for(let i=0;i<d.points.length;i++){const c=this.xy(d.points[i]);if(c&&Math.hypot(q.x-c.x,q.y-c.y)<9)return {id:d.id,endpoint:i};}
    let hit=false;
    if(d.type==='horizontal')hit=Math.abs(q.y-a.y)<7;
    else if(d.type==='vertical')hit=Math.abs(q.x-a.x)<7;
    else if(d.type==='text')hit=q.x>=a.x-5&&q.x<=a.x+Math.max(70,d.text.length*9)&&Math.abs(q.y-a.y)<20;
    else if(['rectangle','fib','measure'].includes(d.type)){const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);hit=q.x>minX-7&&q.x<maxX+7&&q.y>minY-7&&q.y<maxY+7;}
    else if(d.type==='brush'){hit=d.points.slice(1).some((r,i)=>{const c=this.xy(r),prev=this.xy(d.points[i]);return c&&prev&&pointSegmentDistance(q,c,prev)<7;});}
    else hit=pointSegmentDistance(q,a,b,d.type==='ray')<7;
    if(hit)return {id:d.id,endpoint:null};
  }return null;}
  consume(e){e.preventDefault();e.stopImmediatePropagation();}
  down(e){if(e.button!==0||!this.visible)return;const p=this.point(e);if(!p)return;
    if(this.tool==='select'||this.tool==='eraser'){
      const hit=this.hit(p);if(!hit){this.selected=null;this.notify();return;}
      this.consume(e);this.selected=hit.id;
      if(this.tool==='eraser'){this.removeSelected();return;}
      this.snapshot();this.dragging={...hit,origin:p,original:structuredClone(this.items.find(d=>d.id===hit.id))};this.chart.applyOptions({handleScroll:false,handleScale:false});this.container.setPointerCapture(e.pointerId);this.notify();return;
    }
    this.consume(e);this.container.setPointerCapture(e.pointerId);
    if(this.tool==='text'){this.onText(p);return;}
    if(['horizontal','vertical'].includes(this.tool)){this.add({type:this.tool,points:[p]});return;}
    if(this.tool==='brush'){this.draft={id:this.id(),type:'brush',points:[p],color:this.color,width:this.width,text:''};this.brushing=true;this.notify();return;}
    if(!this.draft)this.draft={id:this.id(),type:this.tool,points:[p,p],color:this.color,width:this.width,text:''};
    else{this.draft.points[1]=p;this.add(this.draft);this.draft=null;}
    this.notify();
  }
  move(e){const p=this.point(e);if(!p)return;
    if(this.dragging){this.consume(e);const d=this.dragging,dt=p.time-d.origin.time,dp=p.price-d.origin.price;const item=this.items.find(i=>i.id===d.id);if(d.endpoint!==null)item.points[d.endpoint]=p;else item.points=d.original.points.map(v=>({time:v.time+dt,price:v.price+dp}));this.notify();return;}
    if(this.brushing&&this.draft){if(this.draft.points.length<1000)this.draft.points.push(p);this.notify();return;}
    if(this.draft&&this.draft.points.length===2){this.draft.points[1]=p;this.notify();}
  }
  up(e){if(this.dragging){this.dragging=null;this.chart.applyOptions({handleScroll:this.tool==='select',handleScale:this.tool==='select'});this.commit();}
    if(this.brushing){this.brushing=false;if(this.draft?.points.length>1)this.add(this.draft);this.draft=null;this.notify();}
    try{if(this.container.hasPointerCapture(e.pointerId))this.container.releasePointerCapture(e.pointerId);}catch{}
  }
  cancel(){if(this.dragging){const d=this.dragging;this.items=this.items.map(i=>i.id===d.id?d.original:i);this.past.pop();}this.dragging=null;this.brushing=false;this.draft=null;this.notify();}
  id(){return globalThis.crypto?.randomUUID?.()??`drawing-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
  add(d){const item=validateDrawing({id:this.id(),color:this.color,width:this.width,...d});this.snapshot();this.items.push(item);this.selected=item.id;this.commit();}
  render(target){if(!this.visible)return;target.useMediaCoordinateSpace(scope=>{
    const ctx=scope.context;ctx.save();ctx.rect(0,0,scope.mediaSize.width,scope.mediaSize.height);ctx.clip();
    for(const d of [...this.items,...(this.draft?[this.draft]:[])]){
      const p=d.points.map(p=>this.xy(p));if(p.some(v=>!v))continue;const a=p[0],b=p.at(-1);ctx.strokeStyle=d.color;ctx.fillStyle=d.color+'22';ctx.lineWidth=d.width;ctx.setLineDash([]);
      const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
      const label=(text,x,y)=>{ctx.font='11px system-ui';ctx.fillStyle='#10131bea';ctx.fillRect(x-4,y-14,ctx.measureText(text).width+8,19);ctx.fillStyle=d.color;ctx.fillText(text,x,y);};
      if(d.type==='horizontal'){line(0,a.y,scope.mediaSize.width,a.y);label(a.price??d.points[0].price.toFixed(2),10,a.y-6);}
      else if(d.type==='vertical'){line(a.x,0,a.x,scope.mediaSize.height);}
      else if(d.type==='text'){label(d.text,a.x,a.y);}
      else if(d.type==='brush'){ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.stroke();}
      else if(d.type==='rectangle'||d.type==='measure'){ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);if(d.type==='measure'){const diff=d.points[1].price-d.points[0].price,pct=diff/d.points[0].price*100;label(`${diff>=0?'+':''}${diff.toFixed(2)} (${pct.toFixed(2)}%) · ${Math.round((d.points[1].time-d.points[0].time)/60)}분`,Math.min(a.x,b.x)+8,Math.min(a.y,b.y)-10);}}
      else if(d.type==='fib'){for(const ratio of [0,.236,.382,.5,.618,.786,1]){const y=b.y+(a.y-b.y)*ratio;ctx.setLineDash(ratio===0||ratio===1?[]:[4,3]);line(a.x,y,b.x,y);const price=d.points[1].price+(d.points[0].price-d.points[1].price)*ratio;label(`${ratio} · ${price.toFixed(2)}`,Math.min(a.x,b.x)+5,y-5);}ctx.setLineDash([]);line(a.x,a.y,b.x,b.y);}
      else if(d.type==='ray'){const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)<.1)line(a.x,a.y,a.x,dy>=0?scope.mediaSize.height:0);else{const x=dx>=0?scope.mediaSize.width:0;line(a.x,a.y,x,a.y+(x-a.x)*dy/dx);}}
      else line(a.x,a.y,b.x,b.y);
      if(d.id===this.selected){ctx.fillStyle='#10131b';ctx.strokeStyle=d.color;ctx.lineWidth=1.5;for(const point of d.type==='brush'?[p[0],p.at(-1)]:p){ctx.beginPath();ctx.arc(point.x,point.y,4,0,2*Math.PI);ctx.fill();ctx.stroke();}}
    }ctx.restore();
  });}
}
