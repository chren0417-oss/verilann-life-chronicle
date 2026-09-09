import {env} from 'cloudflare:workers';
import {createGame,steps} from '../../../../lib/game';
import {AIError,planWithAI,type AIEnvironment} from '../../../../lib/ai-provider';

export const dynamic='force-dynamic';

function configuration(){
 const runtime=env as AIEnvironment;
 return {AI_PROVIDER:runtime.AI_PROVIDER||process.env.AI_PROVIDER,OPENAI_API_KEY:runtime.OPENAI_API_KEY||process.env.OPENAI_API_KEY,OPENAI_MODEL:runtime.OPENAI_MODEL||process.env.OPENAI_MODEL,DASHSCOPE_API_KEY:runtime.DASHSCOPE_API_KEY||process.env.DASHSCOPE_API_KEY,BAILIAN_BASE_URL:runtime.BAILIAN_BASE_URL||process.env.BAILIAN_BASE_URL,BAILIAN_MODEL:runtime.BAILIAN_MODEL||process.env.BAILIAN_MODEL};
}

// This route exists only while verifying a deployment. It deliberately builds
// a fresh sample life and returns no model text, secrets, or player save data.
export async function GET(request:Request){
 if(!request.headers.get('oai-authenticated-user-id'))return Response.json({error:'请先登录这个私人网站。'},{status:401});
 const draft=Object.fromEntries(steps.map(step=>[step.key,step.options[0]||'探测者']));
 Object.assign(draft,{name:'规划探测者',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银'});
 const state=createGame(draft),before=JSON.stringify(state),started=Date.now();
 try{
  const decision=await planWithAI(configuration(),state,'下个月先攒钱，顺便练剑，别冒险',null,fetch,request.signal);
  return Response.json({ok:true,elapsedMs:Date.now()-started,next:decision.next?.action||null,milestones:decision.milestones.length,unchanged:before===JSON.stringify(state)},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const failure=error instanceof AIError?error:new AIError('探测请求失败。');
  return Response.json({ok:false,error:failure.message},{status:failure.status,headers:{'Cache-Control':'no-store'}});
 }
}
