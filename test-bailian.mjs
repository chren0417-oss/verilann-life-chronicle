import assert from 'node:assert/strict';
import {importTS} from './test-loader.mjs';
const {createGame,steps,perform}=await importTS('lib/game.ts');
const {planWithAI,aiConfiguration}=await importTS('lib/ai-provider.ts');
const {validateDecision,decisionSchema,planningEconomics}=await importTS('lib/goal-engine.ts');
const draft=Object.fromEntries(steps.map(s=>[s.key,s.options[0]||'测试人物']));
Object.assign(draft,{name:'测试人物',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银'});
const state=createGame(draft),snapshot=JSON.stringify(state);
const decision={interpretation:'这个月稳妥攒钱',horizonDays:30,priorities:['增加净积蓄'],assumptions:['以增加3银为阶段目标'],milestones:[{label:'增加3银',kind:'cash_gain',key:'',target:300}],status:'continue',message:'先工作，体力不足时休息。',next:{action:'work',arg:'',reason:'增加收入'}};
const base='https://ws-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
const env={AI_PROVIDER:'bailian',DASHSCOPE_API_KEY:'bailian-test-secret',BAILIAN_BASE_URL:base,OPENAI_API_KEY:'openai-test-secret'};
const completion=(content=JSON.stringify(decision),finish_reason='stop')=>Response.json({choices:[{finish_reason,message:{content}}]});
let count=0;function check(value,message){assert.ok(value,message);count++}
const budget=planningEconomics(state);
check(perform(state,'work').state.cash-state.cash===budget.weeklyWorkNet,'model work estimate matches game settlement');
check(state.cash-perform(state,'rest').state.cash===budget.twoDayRestLivingCost,'model rest estimate matches game settlement');
check(budget.conservative30DayCashGain<=3*budget.weeklyWorkNet-2*budget.twoDayRestLivingCost,'vague savings target reserves rest and event time');
let captured,calls=0;
const fetcher=async(url,init)=>{calls++;captured={url,init};return completion()};
const parsed=await planWithAI(env,state,'这个月先攒钱，别冒险',null,fetcher);
check(validateDecision(parsed),'valid Bailian completion accepted');
check(captured.url===base+'/chat/completions','workspace endpoint used');
check(captured.init.headers.Authorization==='Bearer bailian-test-secret','provider keys isolated');
check(captured.init.redirect==='manual','redirects cannot forward credentials');
const body=JSON.parse(captured.init.body);
check(body.model==='qwen-plus'&&body.enable_thinking===false&&body.stream===false,'Qwen non-thinking mode');
check(body.response_format.type==='json_object'&&body.messages[0].content.includes('interpretation,horizonDays')&&!body.messages[0].content.includes(JSON.stringify(decisionSchema)),'compact JSON contract supplied in prompt');
check(body.max_tokens===900&&!body.text&&!body.reasoning,'bounded provider-compatible parameters');
check(body.messages[1].content.includes('这个月先攒钱，别冒险')&&body.messages[1].content.includes('weeklyWorkNet'),'compact state and original goal supplied');
check(!JSON.stringify(body).includes('test-secret'),'keys absent from model input');
check(!JSON.stringify(aiConfiguration(env)).includes('test-secret'),'keys absent from public configuration');
check(aiConfiguration(env).provider==='阿里云百炼'&&aiConfiguration(env).configured,'public provider truthful');
check(!aiConfiguration({...env,DASHSCOPE_API_KEY:''}).configured,'OpenAI key cannot substitute missing Bailian key');
for(const invalid of [
 {...env,DASHSCOPE_API_KEY:''}, {...env,DASHSCOPE_API_KEY:'sk-proj-openai'}, {...env,AI_PROVIDER:'unknown'},
 ...['http://ws-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1','https://evil.example/compatible-mode/v1',base+'?token=x',base+'#x','https://user:pass@ws-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1','https://ws-test.cn-beijing.maas.aliyuncs.com.evil.example/compatible-mode/v1'].map(url=>({...env,BAILIAN_BASE_URL:url})),
]){const before=calls;await assert.rejects(()=>planWithAI(invalid,state,'x',null,fetcher));check(calls===before,'invalid setup never calls provider');}
await planWithAI({...env,BAILIAN_BASE_URL:base+'/'},state,'x',null,fetcher);check(captured.url===base+'/chat/completions','trailing slash normalized');
for(const payload of [
 {...decision,priorities:[]}, {...decision,cash:999999},
 {...decision,next:{...decision.next,action:'add_cash'}}, {...decision,next:{...decision.next,cash:999}},
 {...decision,milestones:[{...decision.milestones[0],cheat:true}]}, {...decision,horizonDays:undefined},
]){await assert.rejects(()=>planWithAI(env,state,'x',null,async()=>completion(JSON.stringify(payload))));check(!validateDecision(payload),'schema violations rejected');}
let repairCalls=0;
const repaired=await planWithAI(env,state,'x',null,async(_url,init)=>{repairCalls++;const outgoing=JSON.parse(init.body);if(repairCalls===1)return completion(JSON.stringify({...decision,notes:'无关说明'}));check(outgoing.messages[0].content.includes('修正'), 'invalid JSON gets one compact repair request');return completion(JSON.stringify(decision))});
check(repairCalls===2&&validateDecision(repaired),'valid repair is accepted only after local validation');
for(const [content,reason] of [['','stop'],['not json','stop'],[JSON.stringify(decision),'length'],[JSON.stringify(decision),'content_filter']]){await assert.rejects(()=>planWithAI(env,state,'x',null,async()=>completion(content,reason)));check(true,'incomplete output rejected');}
for(const [status,code,pattern] of [[403,'AllocationQuota.FreeTierOnly',/免费额度已用尽/],[403,'AccessDenied',/模型权限/],[429,'Throttling.AllocationQuota',/请求过快/],[429,'insufficient_quota',/请求过快/],[400,'Arrearage',/欠费/],[401,'InvalidApiKey',/密钥无效/]]){
 await assert.rejects(()=>planWithAI(env,state,'x',null,async()=>Response.json({error:{code,message:'must not echo upstream secrets'}},{status})),pattern);check(true,'upstream errors classified');
}
const controller=new AbortController();controller.abort();
let redirectCalls=0;
await assert.rejects(()=>planWithAI(env,state,'x',null,async()=>{redirectCalls++;return new Response(null,{status:302,headers:{Location:'https://untrusted.example/'}})}),/重定向/);
check(redirectCalls===1,'redirect response is rejected without a second request');
await assert.rejects(()=>planWithAI(env,state,'x',null,async(_url,init)=>{check(init.signal.aborted,'abort reaches provider');throw new Error('aborted')},controller.signal),/取消或超时|百炼响应超时/);
check(JSON.stringify(state)===snapshot,'all requests preserve game state');
console.log(`Passed ${count} Bailian contract, credential isolation and failure checks. Mocked calls only.`);
