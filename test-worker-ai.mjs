import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fromWrangler=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=fromWrangler('miniflare');
const {build}=fromWrangler('esbuild');

// Run the actual provider in workerd, not Node's more permissive fetch runtime.
const compiled=await build({stdin:{contents:`
 import {planWithAI} from './lib/ai-provider.ts';
 import {createGame,steps} from './lib/game.ts';
 export default {async fetch(_request,env){
  const d=Object.fromEntries(steps.map(s=>[s.key,s.options[0]||'测试人物']));
  Object.assign(d,{name:'运行环境测试',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银'});
  const s=createGame(d),before=JSON.stringify(s);
  try{return Response.json({decision:await planWithAI(env,s,'这个月攒钱，别冒险',30),unchanged:JSON.stringify(s)===before})}
  catch(e){return Response.json({error:e.message,unchanged:JSON.stringify(s)===before},{status:e.status||500})}
 }};
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',target:'es2022',write:false});
const decision={interpretation:'这个月安全攒钱',horizonDays:30,priorities:['安全','积蓄'],assumptions:['先以净增7银为阶段目标'],milestones:[{label:'净增加7银',kind:'cash_gain',key:'',target:700}],status:'continue',message:'先安排一周工作。',next:{action:'work',arg:'',reason:'稳定增加收入。'}};
let redirect=false;const requests=[];
const worker=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',
 bindings:{AI_PROVIDER:'bailian',DASHSCOPE_API_KEY:'worker-test-secret',BAILIAN_MODEL:'qwen-plus',BAILIAN_BASE_URL:'https://ws-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'},
 outboundService:async request=>{
  requests.push({url:request.url,auth:request.headers.get('Authorization'),body:await request.text()});
  if(redirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.example/'}});
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(decision)}}]});
 },
});
try{
 let response=await worker.dispatchFetch('http://local.test/api/goal');
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{decision,unchanged:true});
 assert.equal(requests.length,1);assert.equal(requests[0].url,'https://ws-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions');
 assert.equal(requests[0].auth,'Bearer worker-test-secret');assert.ok(!requests[0].body.includes('worker-test-secret'));
 redirect=true;response=await worker.dispatchFetch('http://local.test/api/goal');
 assert.equal(response.status,502);const failure=await response.json();assert.match(failure.error,/重定向/);assert.equal(failure.unchanged,true);
 assert.equal(requests.length,2);assert.ok(requests.every(r=>!r.url.includes('untrusted.example')));
 console.log('Passed 11 workerd runtime, provider response and redirect isolation checks. No external API calls.');
}finally{await worker.dispose()}
