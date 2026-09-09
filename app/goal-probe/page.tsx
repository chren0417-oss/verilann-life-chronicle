import {env} from 'cloudflare:workers';
import {createGame,steps} from '../../lib/game';
import {AIError,planWithAI,type AIEnvironment} from '../../lib/ai-provider';

export const dynamic='force-dynamic';

function configuration(){
 const runtime=env as AIEnvironment;
 return {AI_PROVIDER:runtime.AI_PROVIDER||process.env.AI_PROVIDER,OPENAI_API_KEY:runtime.OPENAI_API_KEY||process.env.OPENAI_API_KEY,OPENAI_MODEL:runtime.OPENAI_MODEL||process.env.OPENAI_MODEL,DASHSCOPE_API_KEY:runtime.DASHSCOPE_API_KEY||process.env.DASHSCOPE_API_KEY,BAILIAN_BASE_URL:runtime.BAILIAN_BASE_URL||process.env.BAILIAN_BASE_URL,BAILIAN_MODEL:runtime.BAILIAN_MODEL||process.env.BAILIAN_MODEL};
}

export default async function GoalProbe(){
 const draft=Object.fromEntries(steps.map(step=>[step.key,step.options[0]||'探测者']));
 Object.assign(draft,{name:'规划探测者',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银'});
 const state=createGame(draft),before=JSON.stringify(state),started=Date.now();
 try{
  const decision=await planWithAI(configuration(),state,'下个月先攒钱，顺便练剑，别冒险',null);
  return <main><h1>在线规划探测通过</h1><p>耗时 {Date.now()-started}ms</p><p>下一步：{decision.next?.action||'无'}</p><p>阶段指标：{decision.milestones.length}</p><p>虚拟角色未改变：{String(before===JSON.stringify(state))}</p></main>;
 }catch(error){
  const failure=error instanceof AIError?error.message:'探测请求失败。';
  return <main><h1>在线规划探测失败</h1><p>{failure}</p></main>;
 }
}
