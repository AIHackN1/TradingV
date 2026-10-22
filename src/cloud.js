// Series primitive: fills the polygon BETWEEN two EMAs in the chart's render cycle.
export class CloudPrimitive {
  constructor(bands){this.bands=bands;this.view={zOrder:()=> 'bottom',renderer:()=>({draw:target=>this.draw(target)})};}
  attached({chart,series,requestUpdate}){this.chart=chart;this.series=series;this.requestUpdate=requestUpdate;}
  detached(){this.chart=null;this.series=null;}
  updateAllViews(){}
  paneViews(){return [this.view];}
  draw(target){if(!this.chart||!this.series)return;target.useBitmapCoordinateSpace(scope=>{
    const {context:ctx,horizontalPixelRatio:h,verticalPixelRatio:v}=scope;
    for(const band of this.bands){const points=band.data.map(p=>({x:this.chart.timeScale().timeToCoordinate(p.time),a:this.series.priceToCoordinate(p.a),b:this.series.priceToCoordinate(p.b)})).filter(p=>p.x!==null&&p.a!==null&&p.b!==null);if(points.length<2)continue;
      ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x*h,p.a*v):ctx.moveTo(p.x*h,p.a*v));points.slice().reverse().forEach(p=>ctx.lineTo(p.x*h,p.b*v));ctx.closePath();ctx.fillStyle=band.color+'2e';ctx.fill();
    }
  });}
}
