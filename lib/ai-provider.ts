import {bailianModelContext,bailianPlannerInstructions,decisionSchema,plannerInstructions,modelContext,validateDecision,type Decision} from './goal-engine';
import type {Game} from './game';

export type AIEnvironment={
 AI_PROVIDER?:string;
 OPENAI_API_KEY?:string;
 OPENAI_MODEL?:string;
 DASHSCOPE_API_KEY?:string;
 BAILIAN_BASE_URL?:string;
 BAILIAN_MODEL?:string;
};
export class AIError extends Error{constructor(message:string,public status=502){super(message)}}

const bailianTokenLimit=900;
const bailianTimeoutMs=8500;
const bailianRepairInstructions=`把用户提供的 JSON 修正为维尔兰目标计划的有效 JSON。只输出修正后的一个 JSON 对象，不要 Markdown，不要说明，不要额外字段。它只能有 interpretation,horizonDays,priorities,assumptions,milestones,status,message,next 八个字段。horizonDays 是 1 至 180 的整数；milestones 是 1 至 5 项，每项仅有 label,kind,key,target，kind 只能是 cash,cash_gain,skill,rank,trust,estate,health,actions。status 只能是 continue,ask,blocked；continue 的 next 必须是仅含 action,arg,reason 的对象，其他状态 next 为 null。action 只能使用 work,rest,train,social,promote,heal,use,buy,quest,deliver,repair,maintain,cast,explore,job,travel,estate,expand,borrow,repay,marry,adopt,retire,sell,abandon,event。展示文字使用简体中文。不要编造计划内容，只修复格式和无关字段。`;

function bailianEndpoint(value:string|undefined){
 try{
  const url=new URL(value?.trim()||'https://dashscope.aliyuncs.com/compatible-mode/v1');
  const official=url.hostname==='dashscope.aliyuncs.com'||/^ws-[a-z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com$/.test(url.hostname);
  if(url.protocol!=='https:'||!official||url.port||url.username||url.password||url.search||url.hash||!/^\/compatible-mode\/v1\/?$/.test(url.pathname))return null;
  return url.origin+'/compatible-mode/v1/chat/completions';
 }catch{return null}
}

export function aiConfiguration(env:AIEnvironment){
 const selected=env.AI_PROVIDER?.trim()||'openai';
 const bailian=selected==='bailian';
 const provider=bailian?'阿里云百炼':'OpenAI';
 const model=(bailian?env.BAILIAN_MODEL:env.OPENAI_MODEL)?.trim()||(bailian?'qwen-plus':'gpt-5-mini');
 const key=(bailian?env.DASHSCOPE_API_KEY:env.OPENAI_API_KEY)?.trim();
 let configurationError='';
 if(!['openai','bailian'].includes(selected))configurationError='AI 服务配置无效，请检查服务端设置。';
 else if(bailian&&!bailianEndpoint(env.BAILIAN_BASE_URL))configurationError='百炼接口地址无效，请使用北京地域的官方兼容接口地址。';
 else if(bailian&&key?.startsWith('sk-proj-'))configurationError='当前填写的是 OpenAI 密钥，请改用这个业务空间的百炼 API Key。';
 else if(!key)configurationError=bailian?'还缺少百炼 API Key。接口地址已配置，请填写同一业务空间的密钥。':'OpenAI 尚未连接，需要先配置 API 密钥。';
 return {configured:!configurationError,model,provider,configurationError};
}

async function upstreamError(response:Response,provider:string){
 const payload=await response.json().catch(()=>null) as {error?:{code?:string},code?:string}|null;
 const code=payload?.error?.code||payload?.code||'';
 if(code==='AllocationQuota.FreeTierOnly')return new AIError('百炼免费额度已用尽或到期，服务已按“免费额度用完即停”停止调用。请更换仍有免费额度的模型。',403);
 if(code==='Arrearage')return new AIError('百炼账户处于欠费状态，暂时无法调用，请检查账户状态。',402);
 if(provider==='OpenAI'&&['credit_balance_exhausted','insufficient_quota'].includes(code))return new AIError('OpenAI 可用额度不足，请检查账户额度；当前人生没有推进。',429);
 if(response.status===401)return new AIError(`${provider}密钥无效，请检查密钥是否正确，以及是否属于当前地域和业务空间。`);
 if(response.status===403)return new AIError(`${provider}拒绝了调用，请检查业务空间的模型权限和账户状态。`);
 if(response.status===429)return new AIError(`${provider}请求过快或模型限额受限，请稍后重试。`,429);
 if(response.status===400||response.status===404)return new AIError(`${provider}未接受当前模型或请求格式，请检查模型名称和接口配置。`);
 return new AIError(`${provider}暂时无法响应，请稍后重试。`);
}

export async function planWithAI(env:AIEnvironment,s:Game,request:string,chosenDays:number|null,fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<Decision>{
 const cfg=aiConfiguration(env);
 if(!cfg.configured)throw new AIError(cfg.configurationError+' 当前人生没有发生变化。',503);
 const bailian=env.AI_PROVIDER?.trim()==='bailian';
 const key=(bailian?env.DASHSCOPE_API_KEY:env.OPENAI_API_KEY)!.trim();
 const endpoint=bailian?bailianEndpoint(env.BAILIAN_BASE_URL)!:'https://api.openai.com/v1/responses';
 const input=JSON.stringify(bailian?{goal:request,chosenDays,state:bailianModelContext(s)}:{request,chosenDays,context:modelContext(s)});
 // JSON mode does not enforce the schema. Validate every field locally before
 // allowing the existing rules engine to assess or execute any proposed action.
 const body=bailian?{
  model:cfg.model,stream:false,enable_thinking:false,max_tokens:bailianTokenLimit,
  messages:[{role:'system',content:bailianPlannerInstructions},{role:'user',content:input}],
  response_format:{type:'json_object'},
 }:{
  model:cfg.model,store:false,instructions:plannerInstructions,input,
  reasoning:{effort:'low'},max_output_tokens:3500,
  text:{format:{type:'json_schema',name:'life_goal_decision',strict:true,schema:decisionSchema}},
 };
 const controller=new AbortController();const abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
 const started=Date.now();
 const timeout=setTimeout(abort,bailian?bailianTimeoutMs:45000);
 try{
  const upstream=async(payload:unknown)=>{
   // Workerd rejects redirect:'error'. Return redirects without following them,
   // then reject them explicitly so Authorization never reaches another host.
   const response=await fetcher(endpoint,{method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   if(response.status>=300&&response.status<400)throw new AIError(`${cfg.provider}接口返回了重定向，已停止请求，请检查接口地址。`);
   if(!response.ok)throw await upstreamError(response,cfg.provider);
   if(bailian){
    const responseBody=await response.json() as {choices?:{finish_reason?:string,message?:{content?:string,refusal?:string}}[]};
    const choice=responseBody.choices?.[0];
    if(choice?.finish_reason!=='stop'||choice.message?.refusal)throw new AIError('AI 尚未生成完整计划，请重试；当前存档没有变化。');
    return choice.message?.content||'';
   }
   const responseBody=await response.json() as {status?:string,output?:{type?:string,content?:{type?:string,text?:string}[]}[]};
   if(responseBody.status!=='completed')throw new AIError('AI 尚未生成完整计划，请重试；当前存档没有变化。');
   return responseBody.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('')||'';
  };
  let result=await upstream(body);
  if(typeof result!=='string'||!result)throw new AIError('AI 未返回可执行的计划，请换一种目标描述。');
  let decision:unknown;try{decision=JSON.parse(result)}catch{throw new AIError('AI 返回的计划格式不完整，已停止执行。')}
  if(bailian&&!validateDecision(decision)){
   // Qwen JSON mode occasionally preserves an otherwise harmless explanatory
   // field. Give it one compact correction pass, then apply the same strict
   // local validation before the game can use the proposal.
   const repaired=await upstream({model:cfg.model,stream:false,enable_thinking:false,max_tokens:bailianTokenLimit,messages:[{role:'system',content:bailianRepairInstructions},{role:'user',content:result.slice(0,6000)}],response_format:{type:'json_object'}});
   try{decision=JSON.parse(repaired)}catch{throw new AIError('AI 返回的计划格式不完整，已停止执行。')}
  }
  if(!validateDecision(decision))throw new AIError('AI 的计划包含无效步骤或指标，已停止执行。');
  return decision;
 }catch(error){
  if(error instanceof AIError)throw error;
  if(controller.signal.aborted)throw new AIError(bailian?'百炼响应超时，请稍后重试；当前存档没有变化。':'AI 请求已取消或超时，你可以继续手动游玩。',504);
  if(bailian&&Date.now()-started>=7000)throw new AIError('百炼响应超时，请稍后重试；当前存档没有变化。',504);
  throw new AIError(`连接${cfg.provider}失败，请稍后重试。`);
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}
