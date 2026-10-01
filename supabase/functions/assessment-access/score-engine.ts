type Option={id?:string;index?:number;value:number;label?:string;label_ar?:string;is_trap?:boolean};
type Question={code:string;axis_id:string;layer?:string;impact?:string;options:Option[]};
type Axis={code:string;name_ar?:string;name_en?:string;weight?:number};
type Trap={name?:string;message?:string;message_ar?:string;question_id:string;validates:string;target_axis:string;penalty_base?:number;penalty_max?:number};
type Assessment={slug?:string;axes:Axis[];questions:Question[];traps?:Trap[];axis_roles?:Record<string,string>;kpi_mappings?:Record<string,Record<string,number>>;ev_mappings?:Record<string,number>;simulator?:{enabled?:boolean;delta_c_max?:number}};
type Response={optionId?:string;optionIndex?:number;value?:number};
type Layer="P"|"M"|"E"|"C"|"X"|"K"|"O";
type ScoreMode="DIRECT_ANCHOR"|"MATURITY_5_STATE"|"SEMANTIC_ONLY"|"EVIDENCE_ONLY"|"SIGNAL_ONLY";
type Interpretation={semanticStateKey:string;measurementType:string;primaryConstruct:string;componentCode:string;measurementLayer:Layer;direction:"POSITIVE"|"NEGATIVE"|"NON_MONOTONIC"|"CONTEXTUAL"|"NOT_APPLICABLE";scoreMode:ScoreMode;anchorScaleId:string;anchorScore?:number;scoreEligible:boolean;criticality:"NORMAL"|"HIGH";consistencyRole:"VALIDATOR"|"TARGET"|"CONTEXT_SIGNAL"|"SUBJECT_TO_RULE"|"NONE";evidenceRole:"NONE"|"PRACTICE_CLAIM"|"MEASUREMENT_CLAIM"|"DOCUMENTATION_CLAIM"|"OBSERVED_OUTCOME"|"EVIDENCE_GAP";contextRequired:boolean;rationale:string;interpretationVersion:number};

const C:Record<string,{c:string;l:Layer;t:string}>= {};
function add(s:string,l:Layer,c:string,codes:string[],t=l==="E"?"EVIDENCE_STATE":l==="M"?"ORDINAL_MATURITY":"ORDINAL_PRACTICE"){for(const q of codes)C[s+":"+q]={c,l,t};}
add("admin-reception-assessment","P","C05",["Qfdbbe8","Qefa857","Qa60da0","Qa6d3c0","Q386668","Q9a86a8"]);
add("admin-reception-assessment","M","C05",["Qaf9f02"]);
add("admin-reception-assessment","M","C08",["Q47b317"]);
add("admin-reception-assessment","M","C07",["Q25f133","Qa5eb11"]);
add("admin-reception-assessment","E","C16",["Q0fea0b"]);
add("clinic-performance","M","C09",["Q1","Q3"]);
add("clinic-performance","M","C04",["Q2","Q7"]);
add("clinic-performance","M","C12",["Q4"]);
add("clinic-performance","E","C10",["Q5","Q8"]);
add("clinic-performance","M","C11",["Q6"]);
add("clinic-performance","M","C13",["Q9"]);
add("medical-team-assessment","P","C01",["Q8b0866","Q2c9f29"]);
add("medical-team-assessment","P","C02",["Q03dc5a","Q0a8cea"]);
add("medical-team-assessment","P","C03",["Q6c6668"]);
add("medical-team-assessment","E","C16",["Q76b7ab"]);
add("medical-team-assessment","P","C07",["Q8e7ea4"]);
add("medical-team-assessment","M","C08",["Q5893f3","Qe603f6"]);
add("medical-team-assessment","P","C04",["Q4084c8"]);
add("medical-team-assessment","M","C07",["Q3f4ff0","Qc4f161"]);
add("comprehensive-clinic-assessment","P","C03",["Q16bab1"]);
add("comprehensive-clinic-assessment","P","C04",["Q28dc45","Q36b062","Qc1373b","Qd46862","Qf85e36"]);
add("comprehensive-clinic-assessment","P","C01",["Q52ce1e"]);
add("comprehensive-clinic-assessment","M","C05",["Q6b69ff","Q750408","Q96e7e9"]);
add("comprehensive-clinic-assessment","E","C10",["Qc4ac3d","Q1614ba","Q005f38","Q12f297","Qc324ce","Qc28969","Q320d3c","Q366f3b","Qa5fe17","Qd07489"]);
add("comprehensive-clinic-assessment","P","C02",["Q1f41c6"]);
add("comprehensive-clinic-assessment","M","C06",["Q4a30d9","Q0f8102"]);
add("comprehensive-clinic-assessment","P","C08",["Q63167e","Q9e24da"]);
add("comprehensive-clinic-assessment","M","C08",["Q48ff74"]);
add("comprehensive-clinic-assessment","E","C16",["Q0635c9","Qe11d0f","Qf2d077"]);
add("comprehensive-clinic-assessment","M","C07",["Q3eb854","Q49536a","Q8c90a0"]);
add("comprehensive-clinic-assessment","E","C14",["Qf3c0c2","Qc68879"]);
add("comprehensive-clinic-assessment","E","C15",["Qac52f7","Q9bbadf"]);
add("patient-journey","P","C12",["Q1","Q3"]);
add("patient-journey","P","C04",["Q2","Q18","Q19","Q21","Q22"]);
add("patient-journey","P","C05",["Q4","Q6","Q7","Q9"]);
add("patient-journey","E","C10",["Q5"]);
add("patient-journey","P","C08",["Q8"]);
add("patient-journey","P","C15",["Q10"]);
add("patient-journey","P","C01",["Q11","Q14"]);
add("patient-journey","K","C03",["Q12","Q13"]);
add("patient-journey","K","C02",["Q15"]);
add("patient-journey","P","C02",["Q16","Q17"]);
add("patient-journey","M","C13",["Q20","Q24"]);
add("patient-journey","M","C04",["Q23"]);
add("patient-journey","E","C15",["Q25"]);

const SEMANTIC_ONLY=new Set(["patient-journey:Q7"]);
const CRITICAL=new Set(["patient-journey:Q12","patient-journey:Q13","patient-journey:Q15","medical-team-assessment:Q6c6668","comprehensive-clinic-assessment:Q16bab1"]);
function interp(a:Assessment,q:Question,o:Option):Interpretation{
  const p=C[(a.slug||"")+":"+q.code]||{c:q.axis_id,l:"P" as Layer,t:"ORDINAL_PRACTICE"};
  const k=(a.slug||"")+":"+q.code, semantic=SEMANTIC_ONLY.has(k), critical=CRITICAL.has(k);
  const mode:ScoreMode=semantic?"SEMANTIC_ONLY":p.l==="E"?"EVIDENCE_ONLY":"DIRECT_ANCHOR";
  return {semanticStateKey:o.id?"OPTION_STATE:"+o.id:"OPTION_STATE:"+k+":"+(o.index??"unknown"),measurementType:p.t,primaryConstruct:p.c,componentCode:p.c,measurementLayer:p.l,direction:semantic?"NON_MONOTONIC":"POSITIVE",scoreMode:mode,anchorScaleId:semantic?"NO_NUMERIC_ANCHOR":"ANCHOR_SOURCE_OPTION_VALUE_V1",anchorScore:semantic?undefined:Number(o.value),scoreEligible:mode==="DIRECT_ANCHOR",criticality:critical?"HIGH":"NORMAL",consistencyRole:"NONE",evidenceRole:p.l==="E"?"MEASUREMENT_CLAIM":"PRACTICE_CLAIM",contextRequired:semantic,rationale:semantic?"Semantic/context signal; no numeric average until a construct-specific scale is approved.":"Anchor is valid only inside this question construct; option_value is not a universal scale.",interpretationVersion:1};
}
function clamp(n:number){return Math.max(0,Math.min(100,n));}
function grade(n:number){return n>=75?"Q4":n>=50?"Q3":n>=25?"Q2":"Q1";}

export function calculateAssessment(a:Assessment,answers:Record<string,number|Response>,simulatorVars:{flow?:number;ltv?:number}={}){
  const raw:Record<string,{earned:number;max:number;eligible:number}>= {};
  for(const x of a.axes)raw[x.code]={earned:0,max:0,eligible:0};
  const interpretations:Record<string,Interpretation>={}, consistencySignals:any[]=[], criticalFlags:any[]=[], evidenceSignals:any[]=[];
  for(const q of a.questions.filter(x=>x.layer!=="B")){
    const supplied=answers[q.code]; if(supplied===undefined)continue;
    const r:Response=typeof supplied==="number"?{value:supplied}:supplied;
    const o=q.options.find(x=>(r.optionId!==undefined&&x.id===r.optionId)||(r.optionIndex!==undefined&&x.index===r.optionIndex)||(r.optionId===undefined&&r.optionIndex===undefined&&Number(x.value)===Number(r.value)));
    if(!o)continue;
    const i=interp(a,q,o); interpretations[q.code]=i;
    if(i.criticality==="HIGH")criticalFlags.push({question:q.code,state:i.semanticStateKey});
    if(i.measurementLayer==="E")evidenceSignals.push({question:q.code,state:i.semanticStateKey});
    if(!i.scoreEligible){consistencySignals.push({question:q.code,state:i.semanticStateKey,type:"SEMANTIC_ONLY",contextRequired:i.contextRequired});continue;}
    if(!raw[q.axis_id])raw[q.axis_id]={earned:0,max:0,eligible:0};
    raw[q.axis_id].eligible++; raw[q.axis_id].earned+=clamp(Number(r.value??o.value)); raw[q.axis_id].max+=100;
  }
  const axisScores:Record<string,number>={},coverage:Record<string,number>={};
  for(const x of a.axes){
    const r=raw[x.code]||{earned:0,max:0,eligible:0};
    const total=a.questions.filter(q=>q.axis_id===x.code&&q.layer!=="B").length;
    coverage[x.code]=total?Math.round(r.eligible/total*100):0;
    axisScores[x.code]=r.max?Math.round(clamp(r.earned/r.max*100)):0;
  }
  const active=a.axes.filter(x=>(raw[x.code]?.eligible||0)>0), tw=active.reduce((s,x)=>s+(Number(x.weight)||1),0);
  const overallScore=tw?Math.round(active.reduce((s,x)=>s+axisScores[x.code]*(Number(x.weight)||1),0)/tw):0;
  const roleScores:Record<string,number>={};
  for(const x of active){const role=a.axis_roles?.[x.code];if(role)roleScores[role]=roleScores[role]===undefined?axisScores[x.code]:Math.round((roleScores[role]+axisScores[x.code])/2);}
  const kpis:Record<string,number|null>={};
  for(const [code,map] of Object.entries(a.kpi_mappings||{})){let s=0,w=0;for(const [role,rw] of Object.entries(map)){if(roleScores[role]===undefined)continue;s+=roleScores[role]*Number(rw);w+=Number(rw);}kpis[code]=w?Math.round(s/w):null;}
  let ev=null;
  if(a.simulator?.enabled){
    let s=0,w=0;for(const [role,rw] of Object.entries(a.ev_mappings||{})){if(roleScores[role]===undefined)continue;s+=roleScores[role]*Number(rw);w+=Number(rw);}
    if(w&&Number(simulatorVars.flow)>0&&Number(simulatorVars.ltv)>0){const base=(s/w/100)*(a.simulator.delta_c_max||0.35)*Number(simulatorVars.flow)*Number(simulatorVars.ltv);ev={currentEV:Math.round(base*.7),potentialEV:Math.round(base*1.25),gap:Math.round(base*.55)};}
  }
  return {overallScore,classification:grade(overallScore),leakageIndex:Math.round(100-overallScore),axisScores,coverage,roleScores,kpis,evSimulator:ev,traps:[],consistencySignals,criticalFlags,evidenceSignals,interpretations,model:{version:"p3-kernel-v1",missingPolicy:"excluded-from-denominator",unsupportedRolePolicy:"unavailable",trapPolicy:"diagnostic-only",universalScale:false}};
}
