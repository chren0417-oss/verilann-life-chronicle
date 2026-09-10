import {events,perform,money,difficulty,regions,adultAge,type Choice,type Game,type Hosting} from './game';

export type HostingStep={state:Game,action:string,reason:string,error?:string};

export function shouldRest(s:Game,h:Hosting){
 const staminaTriggered=h.staminaBelow!==null&&s.stamina<h.staminaBelow;
 const emergencyHpLine=h.hpBelow===null?null:Math.min(10,h.hpBelow);
 const hpTriggered=emergencyHpLine!==null&&s.hp<emergencyHpLine;
 const injuryTriggered=s.injury>15;
 return staminaTriggered||hpTriggered||injuryTriggered;
}

export function weeklyLiving(s:Game){
 return Math.round(7*(difficulty(s).living+s.children.filter(c=>(s.day+7-c.born)/360<adultAge(s.draft.race)).length*8)*regions[s.region].price);
}

function affordable(s:Game,c:Choice){return !c.cost||s.cash>=c.cost}
function regularSkillAllowed(s:Game,c:Choice){if(!c.skill)return true;return c.breakthrough?s.skills[c.skill]<120:s.skills[c.skill]<100}
function rewardValue(c:Choice){return (c.reward||0)+(c.fame||0)*18+(c.trust||0)*6+(c.item?30:0)}

export function chooseHostedEvent(s:Game):number|null{
 const event=events.find(e=>e.id===s.event);if(!event)return null;
 let candidates=event.choices.map((choice,index)=>({choice,index})).filter(({choice})=>affordable(s,choice)&&regularSkillAllowed(s,choice));
 if(!candidates.length){candidates=event.choices.map((choice,index)=>({choice,index})).filter(({choice})=>!choice.cost||s.cash>=choice.cost);if(!candidates.length)candidates=event.choices.map((choice,index)=>({choice,index}));}
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
  const cost=(choice.cost||0)*(s.hosting?.temperament==='adventure' ? .5 : s.hosting?.temperament==='balanced' ? .9 : 1.3);
  return breakthrough+skillPriority+reward-cost-(choice.hurt||0)*riskWeight-index/1000;
 };
 candidates.sort((a,b)=>score(b)-score(a));return candidates[0].index;
}

export function hostedStep(s:Game):HostingStep{
 let h=s.hosting;if(!h?.active)return {state:s,action:'',reason:'托管尚未开始。',error:'托管尚未开始。'};
 if(s.dead||s.retired)return {state:{...s,hosting:{...h,active:false,reason:'这段人生已经结束。'}},action:'',reason:'这段人生已经结束。',error:'这段人生已经结束。'};
 const weekly=weeklyLiving(s);
 if(s.cash<weekly*2)return {state:{...s,hosting:{...h,active:false,reason:'现金不足两周食宿（约'+money(weekly*2)+'），托管已暂停，以免坐吃山空。请先手动工作或处理背包，再继续托管。'}},action:'',reason:'现金不足，托管已暂停。',error:'现金不足，托管已暂停。'};
 if(s.event){const index=chooseHostedEvent(s);if(index===null)return {state:{...s,hosting:{...h,active:false,reason:'当前事件没有符合托管规则的可选方案。'}},action:'',reason:'当前事件没有符合托管规则的可选方案。',error:'当前事件没有符合托管规则的可选方案。'};const result=perform(s,'event',String(index));if(result.error)return {state:{...s,hosting:{...h,active:false,reason:result.error}},action:'event',reason:result.error,error:result.error};const ev=events.find(e=>e.id===s.event);const evLabel=ev?ev.title+' → '+(ev.choices[Number(index)]?.label||'处理'):'事件已自动处理';return {state:{...result.state,hosting:{...h,active:true,completed:h.completed+1,reason:'已自动处理事件：'+evLabel}},action:'event',reason:'已自动处理事件：'+evLabel};}
 const pendingQuest=s.quests.find(q=>q.status==='进行中');
 if(pendingQuest&&s.skills[pendingQuest.skill]>=pendingQuest.need&&s.day+3<=pendingQuest.due){const dr=perform(s,'deliver');if(!dr.error)return {state:{...dr.state,hosting:{...h,resting:false,active:true,completed:h.completed+1,reason:'已按时交付委托，获得报酬。'}},action:'deliver',reason:'已完成委托交付。'};}
 let action=shouldRest(s,h)?'rest':h.action;
 if(s.injury>30&&s.cash>=120)action='heal';
 if(action!=='rest'&&action!=='heal'&&h.action==='explore'){
  if(h.forcedWork){if(s.cash>=weekly*8)h={...h,forcedWork:false};else action='work';}
  else if(s.cash<weekly*6){h={...h,forcedWork:true};action='work';}
 }
 const result=perform(s,action);if(result.error)return {state:{...s,hosting:{...h,active:false,reason:result.error}},action,reason:result.error,error:result.error};
 return {state:{...result.state,hosting:{...h,resting:false,active:true,completed:h.completed+1,reason:action==='rest'?'本次仅休息一次，随后继续托管行动。':action==='heal'?'伤势较重，安排医者治疗。':h.forcedWork&&h.action==='explore'?'现金偏紧，临时改为稳定工作，避免探索亏损。':'已完成一段托管行动。'}},action,reason:action==='rest'?'已完成一次休息。':action==='heal'?'已安排治疗。':'继续托管行动。'};
}
