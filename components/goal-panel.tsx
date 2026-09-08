'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,Play,Pause,ArrowRight,Check,Clock,Target} from 'lucide-react';
import {date,money,type Game} from '../lib/game';
import {makeGoal,validateDecision,assessAction,executeGoalAction,goalReached,milestoneValue,actionLabel,type Decision} from '../lib/goal-engine';
import type {LifeGoal} from '../lib/goal-types';
type Props={game:Game,slotId:string,initialText:string,onCommit:(next:Game,expected:Game,slot:string,history:boolean,revision:number)=>boolean,getRevision:()=>number,onManual:()=>void};
type Connection={configured:boolean,model:string,provider:string,configurationError?:string};
export default function GoalPanel({game,slotId,initialText,onCommit,getRevision,onManual}:Props){
 const [input,setInput]=useState(initialText||game.aiGoal?.request||''),[days,setDays]=useState('auto'),[running,setRunning]=useState(false),[error,setError]=useState(''),[phase,setPhase]=useState(''),[connection,setConnection]=useState<Connection|null>(null);
 const abortRef=useRef<AbortController|null>(null),serial=useRef(0),expected=useRef(game),slot=useRef(slotId),isRunning=useRef(false),live=useRef(true);const expectedRevision=useRef(getRevision());const current=useRef(game);current.current=game;
 function cancel(){serial.current++;abortRef.current?.abort();abortRef.current=null;isRunning.current=false;setRunning(false);setPhase('');}
 useEffect(()=>{live.current=true;fetch('/api/goal',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(v=>{if(live.current)setConnection(v as Connection)}).catch(()=>{if(live.current)setError('暂时无法检查 AI 连接状态，请稍后重试。')});return ()=>{live.current=false;serial.current++;abortRef.current?.abort()}},[]);
 useEffect(()=>{if(isRunning.current&&(game!==expected.current||slotId!==slot.current)){cancel();setError('人物或存档已发生变化，已停止旧计划的推进。')}},[game,slotId]);
 function commit(n:Game,base:Game,record=true){expected.current=n;if(!onCommit(n,base,slotId,record,expectedRevision.current)){cancel();if(live.current)setError('当前存档已经变化，请重新继续目标。');return false}expectedRevision.current=getRevision();current.current=n;return true}
 function pause(){cancel();expectedRevision.current=getRevision();const s=current.current;if(s.aiGoal){const n={...s,aiGoal:{...s.aiGoal,status:'paused' as const,pauseReason:'你暂停了自动推进。'}};commit(n,s,false)}setError('')}
 function halt(s:Game,reason:string,complete=false){if(!s.aiGoal)return;const n={...s,aiGoal:{...s.aiGoal,status:complete?'complete' as const:'paused' as const,pauseReason:reason,proposal:complete?null:s.aiGoal.proposal}};commit(n,s,false)}
 async function run(newGoal:boolean){
  const request=newGoal?input.trim():current.current.aiGoal?.request;if(!request){setError('写下一句目标描述即可，不需要列行动清单。');return}if(request.length>1500){setError('目标描述请控制在1500字以内。');return}
  if(connection&&!connection.configured){setError((connection.configurationError||'AI 尚未连接，请先完成连接设置。')+' 目标没有执行，存档未改变。');return}
  if(current.current.event){setError('请先处理当前事件，再来安排或继续目标。');return}
  cancel();const ticket=++serial.current;const controller=new AbortController();abortRef.current=controller;isRunning.current=true;setRunning(true);setError('');slot.current=slotId;let local=current.current;expected.current=local;expectedRevision.current=getRevision();let first=newGoal;
  const stale=()=>!live.current||ticket!==serial.current||controller.signal.aborted||getRevision()!==expectedRevision.current;
  try{
   for(let batch=0;batch<12;batch++){
    if(stale())return;const g=local.aiGoal;
    if(!first&&g){if(goalReached(local,g)){halt(local,'已达到本阶段全部指标。',true);break}if(local.event){halt(local,'遇到新的事件，请先亲自选择。');break}if(local.day>=g.deadlineDay){halt(local,'这段安排的时间已到，请回顾进展后设置下一阶段。');break}if(g.actions.length>=200){halt(local,'已达到本目标行动上限，请设置下一阶段。');break}}
    setPhase(first?'正在理解你的目标与优先顺序…':'根据刚刚发生的事情，安排下一步…');
    const state={...local,log:local.log.slice(-8),...(first?{aiGoal:undefined}:{})};const response=await fetch('/api/goal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,goal:request,days:first&&days!=='auto'?Number(days):null}),signal:controller.signal});const result=await response.json() as {error?:string,decision?:unknown};if(stale())return;
    if(!response.ok)throw new Error(result.error||'AI 暂时无法规划，请重试。');if(!validateDecision(result.decision))throw new Error('AI 返回的计划不完整，已停止执行。');const d:Decision=result.decision;
    const goal:LifeGoal=first?makeGoal(local,request,d,days==='auto'?null:Number(days)):{...local.aiGoal!,status:'ready',pauseReason:'',lastReason:d.message,proposal:d.next};
    if(first&&goalReached(local,goal))throw new Error('AI给出的阶段指标已经满足，请补充你希望进一步达到的程度后重试。');const planned={...local,aiGoal:goal};if(!commit(planned,local,first))return;local=planned;first=false;
    if(d.status!=='continue'||!d.next){halt(local,d.message||'AI 需要你补充目标方向。');break}
    const check=assessAction(local,goal,d.next);if(check.kind!=='auto'){halt(local,check.reason);break}
    setPhase(actionLabel(d.next)+' · '+d.next.reason);
    const step=executeGoalAction(local,d.next);if(step.error){halt(local,step.error);break}if(!commit(step.state,local,true))return;local=step.state;
    // Yield between requests so pause/manual controls remain usable.
    await new Promise(resolve=>setTimeout(resolve,350));if(stale())return;
    if(local.aiGoal?.status!=='ready')break;
    if(batch===11)halt(local,'已推进12步，先回顾本段经历；点击继续可接着安排。');
   }
  }catch(e){if(!stale())setError(e instanceof Error?e.message:'AI 连接失败，已停止推进。')}
  finally{if(ticket===serial.current&&live.current){isRunning.current=false;setRunning(false);setPhase('');abortRef.current=null}}
 }
 function approve(){cancel();expectedRevision.current=getRevision();const base=current.current;const a=base.aiGoal?.proposal;if(!a)return;const result=executeGoalAction(base,a,true);if(result.error)setError(result.error);else if(commit(result.state,base,true))setError('');}
 const goal=game.aiGoal;const proposal=goal?.proposal;const check=goal&&proposal?assessAction(game,goal,proposal):null;
 return <div className="goal-panel"><div className="goal-intro"><Sparkles size={28}/><div><h3>说出方向，让日子朝它前进</h3><p>不必列出步骤。AI会结合你的处境，逐步安排工作、学习和生活。</p></div></div>
 <label className="goal-label" htmlFor="life-goal">你接下来想做什么？</label><textarea id="life-goal" maxLength={1500} value={input} disabled={running} onChange={e=>setInput(e.target.value)} placeholder="比如：下个月先攒点钱，顺便练好剑术，别冒险。"/>
 <div className="goal-examples">{['下个月先攒钱，顺便练剑，别冒险','我想开一间自己的工坊，先做准备','最近太累了，休养身体，多陪陪家人'].map(t=><button disabled={running} key={t} onClick={()=>setInput(t)}>{t}</button>)}</div>
 <div className="goal-controls"><label>安排多久<select value={days} disabled={running} onChange={e=>setDays(e.target.value)}><option value="auto">从描述中理解</option><option value="7">7日</option><option value="30">1个月</option><option value="90">3个月</option><option value="180">半年</option></select></label>{running?<button className="primary" onClick={pause}><Pause size={17}/>暂停推进</button>:<button className="primary" disabled={!input.trim()||game.dead||game.retired} onClick={()=>void run(true)}><Sparkles size={17}/>{goal?'按新目标推进':'理解并开始'}</button>}</div>
 <p className="goal-note">未写期限时按30日安排。每次最多连续推进12步，可随时暂停；重要选择交给你。角色现状和目标会发送给{connection?.provider||'已配置的 AI 服务'}。</p>
 {running&&<div className="goal-working" role="status"><span className="goal-spinner"/>{phase}</div>}{error&&<p role="alert" className="goal-error">{error}</p>}
 {connection&&!connection.configured&&<div className="goal-connection"><small>{connection.provider} · 尚未连接</small><h3>目标玩法已就绪，还需连接 AI</h3><p>{connection.configurationError} 请回到本对话完成配置，密钥保存在网站服务端，不写入人生存档。</p><p>现在仍可手动游玩。</p></div>}
 {connection?.provider==='阿里云百炼'&&<p className="goal-note">如只使用免费额度，请在百炼控制台为 {connection.model} 开启“免费额度用完即停”。</p>}
 {goal&&<div className="goal-plan"><div className="goal-plan-title"><small>阶段目标 · {goal.status==='complete'?'已完成':running?'推进中':'等待继续'}</small><span><Clock size={13}/>{date(goal.createdDay)} → {date(goal.deadlineDay)}</span></div><h3>{goal.interpretation}</h3><div className="goal-priorities">{goal.priorities.map((p,i)=><span key={i}>{i+1}. {p}</span>)}</div>{goal.assumptions.length>0&&<details><summary>我作出的假设</summary>{goal.assumptions.map((a,i)=><p key={i}>{a}</p>)}</details>}
 <div className="goal-milestones">{goal.milestones.map((m,i)=>{const value=milestoneValue(game,goal,m),done=value>=m.target;const fmt=(n:number)=>m.kind==='cash'||m.kind==='cash_gain'?(n<0?'−':'')+money(Math.abs(n)):Math.round(n);return <div key={i} className={done?'done':''}><span>{done?<Check size={16}/>:<Target size={16}/>}</span><div><b>{m.label}</b><small>{fmt(value)} / {fmt(m.target)}</small></div></div>})}</div>
 <div className="goal-progress"><span>已推进 {game.day-goal.createdDay} / {goal.deadlineDay-goal.createdDay} 日</span><span>{goal.actions.length} 次行动</span></div><div className="track"><i style={{width:Math.min(100,(game.day-goal.createdDay)/(goal.deadlineDay-goal.createdDay)*100)+'%'}}/></div>
 {goal.lastReason&&<p className="goal-reason">{goal.lastReason}</p>}{goal.pauseReason&&<div className="goal-pause">{goal.pauseReason}</div>}
 {!running&&proposal&&check?.kind==='confirm'&&<div className="goal-proposal"><small>交给你决定</small><h3>{actionLabel(proposal)}</h3><p>{proposal.reason}</p><button onClick={approve}>执行这一步<ArrowRight size={16}/></button></div>}
 {!running&&goal.status!=='complete'&&<div className="save-actions"><button disabled={!!game.event||game.day>=goal.deadlineDay||game.dead||game.retired} onClick={()=>void run(false)}><Play size={16}/>继续围绕此目标</button>{game.event&&<button onClick={onManual}>先处理眼前事件</button>}</div>}
 </div>}
 {connection?.configured&&<p className="goal-connected">● 已配置 {connection.provider} · {connection.model} · 开始目标时验证连接</p>}
 </div>
}

