import {env} from 'cloudflare:workers';
import {validSave} from '../../../lib/game';
import {aiConfiguration,planWithAI,AIError,type AIEnvironment} from '../../../lib/ai-provider';
export const dynamic='force-dynamic';
const configuration=()=>({OPENAI_API_KEY:(env as AIEnvironment).OPENAI_API_KEY||process.env.OPENAI_API_KEY,OPENAI_MODEL:(env as AIEnvironment).OPENAI_MODEL||process.env.OPENAI_MODEL});
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const requests=new Map<string,{count:number,reset:number,active:boolean}>();
export function GET(request:Request){if(!request.headers.get('oai-authenticated-user-id'))return json({error:'请先登录这个私人网站。'},401);return json(aiConfiguration(configuration()))}
export async function POST(request:Request){
 const actor=request.headers.get('oai-authenticated-user-id');if(!actor)return json({error:'请先登录这个私人网站。'},401);
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'请求来源无效。'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'请求必须使用JSON。'},415);
 if(Number(request.headers.get('content-length')||0)>200000)return json({error:'请求内容过大。'},413);
 const now=Date.now();for(const [key,r] of requests)if(r.reset<now&&!r.active)requests.delete(key);
 const limit=requests.get(actor)||{count:0,reset:now+60000,active:false};if(limit.active||limit.count>=30)return json({error:'已有规划在进行，或本分钟请求较多，请稍后再试。'},429);limit.count++;limit.active=true;requests.set(actor,limit);
 try{const reader=request.body?.getReader();if(!reader)return json({error:'缺少请求内容。'},400);const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>200000){await reader.cancel();return json({error:'请求内容过大。'},413)}chunks.push(part.value)}const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength}const body=JSON.parse(new TextDecoder().decode(buffer));
  if(!body||!validSave(body.state)||typeof body.goal!=='string'||!body.goal.trim()||body.goal.length>1500||!(body.days===null||Number.isInteger(body.days)&&body.days>=1&&body.days<=180))return json({error:'目标描述、期限或存档无效。'},400);
  const g=body.state;if(g.dead||g.retired)return json({error:'当前人生已结束。'},409);if(g.event)return json({error:'请先选择当前事件的处理方式。'},409);
  return json({decision:await planWithAI(configuration(),g,body.goal.trim(),body.days,fetch,request.signal)});
 }catch(error){if(error instanceof AIError)return json({error:error.message},error.status);return json({error:'无法读取目标请求，请检查输入后重试。'},400)}finally{limit.active=false}
}
