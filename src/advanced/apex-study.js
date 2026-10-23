// Our adapter for the licensed Advanced Charts API. Contains no vendor code.
// Not loaded by the free TradingView iframe. Native rendering awaits licensed QA.
import {ema} from '../technical.js';
import {calculateApexSignals,validateSignalSettings} from '../apex-signals.js';

export const STUDY_NAME='APEX v1.7 · 구름 + 점수필터 (부분 이식)';
const lengths=[144,155,89,100,55,65,34,40];
const colors=['#00c86e','#ff9100','#00afdc','#cd46ff'];
const groups=['초록','주황','파랑','보라'];
export const APEX_INPUTS=[
  ...lengths.map((defval,i)=>({id:`ema${i}`,name:`${groups[i>>1]} EMA ${i%2+1}`,type:'integer',defval,min:1,max:400})),
  {id:'cloudTimeframe',name:'구름 계산 시간축',type:'text',defval:'현재 차트',options:['현재 차트','레짐 TF1 (1h)','레짐 TF2 (4h)']},
  {id:'minScore',name:'최소 점수',type:'float',defval:60,min:0,max:100},
  {id:'chopMax',name:'CI 상한',type:'float',defval:49,min:0,max:100},
  {id:'gapAtr',name:'터널 최소 ATR',type:'float',defval:1,min:0,max:10},
  {id:'cooldown',name:'시그널 대기 봉수',type:'integer',defval:8,min:0,max:200},
];
export function parseApexInputs(input){
  const values=APEX_INPUTS.map((item,i)=>input(i)??item.defval);
  if(values.slice(0,8).some(v=>!Number.isInteger(v)||v<1||v>400))throw new Error('EMA 기간은 1~400 정수입니다.');
  if(!APEX_INPUTS[8].options.includes(values[8]))throw new Error('지원하지 않는 구름 시간축입니다.');
  return {lengths:values.slice(0,8),cloudTimeframe:values[8],signalSettings:validateSignalSettings({minScore:values[9],chopMax:values[10],gapAtr:values[11],cooldown:values[12]})};
}

// Build once per immutable feed snapshot + input settings, not once per plot/bar.
// Exact bar timestamps, not screen coordinates, join the indicator to the chart.
export function calculateNativeApex(snapshot,settings){
  const {candles,h1=[],h4=[],observedAt,resolution}=snapshot;
  const source=settings.cloudTimeframe==='현재 차트'?candles:settings.cloudTimeframe==='레짐 TF1 (1h)'?h1:h4;
  const curves=settings.lengths.map(length=>ema(source.map(c=>c.close),length));
  const signals=['1','5','15','60'].includes(resolution)?calculateApexSignals(candles,{h1,h4,hour:Math.floor(observedAt/3600000)},settings.signalSettings):[];
  let prior=-1;
  return new Map(candles.map((c,i)=>{
    if(source!==candles)while(prior+1<source.length&&source[prior+1].closeTime<c.time*1000)prior++;
    const index=source===candles?i:prior;
    const values=curves.map(curve=>curve[index]??NaN);
    const signal=signals[i];
    // A snapshot's provider timestamp is authoritative; a local clock never
    // promotes an unfinished provider candle into an alert or historical marker.
    const closed=c.closeTime<observedAt;
    values.push(closed&&signal?.longSignal?1:NaN,closed&&signal?.shortSignal?1:NaN);
    return [c.time*1000,values];
  }));
}

export function createApexStudy(PineJS,readSnapshot){
  const plots=lengths.map((_,i)=>({id:`ema${i}`,type:'line'}));
  const styles={},defaultStyles={};
  lengths.forEach((length,i)=>{
    styles[`ema${i}`]={title:`${groups[i>>1]} EMA ${i%2+1}`,histogramBase:0};
    defaultStyles[`ema${i}`]={linestyle:0,linewidth:1,plottype:2,trackPrice:false,visible:true,color:colors[i>>1],transparency:35};
  });
  for(const [id,label,color,location,shape] of [['long','점수필터 LONG','#00c86e','BelowBar','shape_triangle_up'],['short','점수필터 SHORT','#ff5252','AboveBar','shape_triangle_down']]){
    plots.push({id,type:'shapes'});
    styles[id]={title:label,text:label,location,isHidden:false};
    defaultStyles[id]={color,textColor:color,plottype:shape,location,visible:true};
  }
  return {
    name:STUDY_NAME,
    metainfo:{
      _metainfoVersion:53,id:'TradingVAPEXPartial@tv-basicstudies-1',description:STUDY_NAME,shortDescription:'APEX 부분 이식',
      is_price_study:true,isCustomIndicator:true,format:{type:'inherit'},plots,styles,
      inputs:APEX_INPUTS.map(item=>({...item})),
      filledAreas:groups.map((title,i)=>({id:`cloud${i}`,objAId:`ema${i*2}`,objBId:`ema${i*2+1}`,type:'plot_plot',title:`${title} 구름`,fillgaps:false})),
      defaults:{styles:defaultStyles,inputs:Object.fromEntries(APEX_INPUTS.map(i=>[i.id,i.defval])),
        filledAreasStyle:Object.fromEntries(colors.map((color,i)=>[`cloud${i}`,{color,transparency:82,visible:true}]))},
    },
    constructor:function(){
      this.init=function(){this.snapshot=null;this.key=null;this.rows=null;};
      this.main=function(context,input){
        const symbol=PineJS.Std.ticker(context),resolution=String(PineJS.Std.period(context));
        const snapshot=readSnapshot(symbol,resolution);
        if(!snapshot)return Array(10).fill(NaN);
        const settings=parseApexInputs(input),key=JSON.stringify(settings);
        if(this.snapshot!==snapshot||this.key!==key){
          this.rows=calculateNativeApex(snapshot,settings);this.snapshot=snapshot;this.key=key;
        }
        return [...(this.rows.get(context.symbol.time)||Array(10).fill(NaN))];
      };
    },
  };
}
