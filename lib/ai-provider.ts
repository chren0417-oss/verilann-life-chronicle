import {decisionSchema,plannerInstructions,modelContext,validateDecision,type Decision} from './goal-engine';
import type {Game} from './game';
export type AIEnvironment={OPENAI_API_KEY?:string,OPENAI_MODEL?:string};
export class AIError extends Error{constructor(message:string,public status=502){super(message)}}
export function aiConfiguration(env:AIEnvironment){return {configured:Boolean(env.OPENAI_API_KEY?.trim()),model:env.OPENAI_MODEL?.trim()||'gpt-5-mini',provider:'OpenAI'}}
export async function planWithAI(env:AIEnvironment,s:Game,request:string,chosenDays:number|null,fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<Decision>{
 const cfg=aiConfiguration(env);if(!cfg.configured)throw new AIError('OpenAI 尚未连接。需要先为这个网站配置 API 密钥，当前人生没有发生变化。',503);
 const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();const timeout=setTimeout(abort,45000);
 try{
  const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:cfg.model,store:false,instructions:plannerInstructions,input:JSON.stringify({request,chosenDays,context:modelContext(s)}),reasoning:{effort:'low'},max_output_tokens:3500,text:{format:{type:'json_schema',name:'life_goal_decision',strict:true,schema:decisionSchema}}}),signal:controller.signal});
  if(!response.ok){if(response.status===401||response.status===403)throw new AIError('OpenAI 密钥无效，或账号没有所选模型的权限。',502);if(response.status===429)throw new AIError('OpenAI 额度或请求频率受限，请检查额度后再继续。',429);throw new AIError('OpenAI 暂时无法响应，请稍后重试。')}
  const payload=await response.json() as {status?:string,output?:{type?:string,content?:{type?:string,text?:string}[]}[]};if(payload.status!=='completed')throw new AIError('AI 尚未生成完整计划，请重试；当前存档没有变化。');
  const result=payload.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('');if(!result)throw new AIError('AI 未返回可执行的计划，请换一种目标描述。');
  let decision:unknown;try{decision=JSON.parse(result)}catch{throw new AIError('AI 返回的计划格式不完整，已停止执行。')}
  if(!validateDecision(decision))throw new AIError('AI 的计划包含无效步骤或指标，已停止执行。');return decision;
 }catch(error){if(error instanceof AIError)throw error;if(controller.signal.aborted)throw new AIError('AI 请求已取消或超时，你可以继续手动游玩。',504);throw new AIError('连接 OpenAI 失败，请稍后重试。')}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}
