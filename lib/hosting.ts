import {events,perform,type Choice,type Game,type Hosting} from './game';

export type HostingStep={state:Game,action:string,reason:string,error?:string};

export function shouldRest(s:Game,h:Hosting){
 const staminaTriggered=h.staminaBelow!==null&&s.stamina<h.staminaBelow;
 const emergencyHpLine=h.hpBelow===null?null:Math.min(10,h.hpBelow);
 const hpTriggered=emergencyHpLine!==null&&s.hp<emergencyHpLine;
 return staminaTriggered||hpTriggered;
}

function affordable(s:Game,c:Choice){return !c.cost||s.cash>=c.cost}
function regularSkillAllowed(s:Game,c:Choice){if(!c.skill)return true;return c.breakthrough?s.skills[c.skill]<120:s.skills[c.skill]<100}
function rewardValue(c:Choice){return (c.reward||0)+(c.fame||0)*35+(c.trust||0)*14+(c.item?45:0)}

export function chooseHostedEvent(s:Game):number|null{
 const event=events.find(e=>e.id===s.event);if(!event)return null;
 let candidates=event.choices.map((choice,index)=>({choice,index})).filter(({choice})=>affordable(s,choice)&&regularSkillAllowed(s,choice));
 if(!candidates.length)return null;
 if(s.hosting?.temperament==='cautious'){
  const safe=candidates.filter(({choice})=>!choice.hurt);
  if(safe.length)candidates=safe;
 }
 const riskWeight=s.hosting?.temperament==='adventure'?1:s.hosting?.temperament==='balanced'?7:30;
 const score=({choice,index}:{choice:Choice,index:number})=>{
  const skill=choice.skill?s.skills[choice.skill]||0:0;
  const breakthrough=choice.breakthrough?2000:0;
  const skillPriority=choice.skill?skill*1000:0;
  const reward=rewardValue(choice)*(s.hosting?.temperament==='cautious' ? .45 : 1);
  const cost=(choice.cost||0)*(s.hosting?.temperament==='adventure' ? .03 : s.hosting?.temperament==='balanced' ? .2 : .7);
  return breakthrough+skillPriority+reward-cost-(choice.hurt||0)*riskWeight-index/1000;
 };
 candidates.sort((a,b)=>score(b)-score(a));return candidates[0].index;
}

export function hostedStep(s:Game):HostingStep{
 const h=s.hosting;if(!h?.active)return {state:s,action:'',reason:'托管尚未开始。',error:'托管尚未开始。'};
 if(s.dead||s.retired)return {state:{...s,hosting:{...h,active:false,reason:'这段人生已经结束。'}},action:'',reason:'这段人生已经结束。',error:'这段人生已经结束。'};
 if(s.event){const index=chooseHostedEvent(s);if(index===null)return {state:{...s,hosting:{...h,active:false,reason:'当前事件没有符合托管规则的可选方案。'}},action:'',reason:'当前事件没有符合托管规则的可选方案。',error:'当前事件没有符合托管规则的可选方案。'};const result=perform(s,'event',String(index));if(result.error)return {state:{...s,hosting:{...h,active:false,reason:result.error}},action:'event',reason:result.error,error:result.error};return {state:{...result.state,hosting:{...h,active:true,completed:h.completed+1,reason:'已按托管规则处理事件。'}},action:'event',reason:'已自动处理事件。'};}
 const action=shouldRest(s,h)?'rest':h.action;const result=perform(s,action);if(result.error)return {state:{...s,hosting:{...h,active:false,reason:result.error}},action,reason:result.error,error:result.error};
 return {state:{...result.state,hosting:{...h,resting:false,active:true,completed:h.completed+1,reason:action==='rest'?'本次仅休息一次，随后继续托管行动。':'已完成一段托管行动。'}},action,reason:action==='rest'?'已完成一次休息。':'继续托管行动。'};
}
