// 世界剧情系统专项验证：暮林《树根下的门》完整链 / 分支flag / 截止过期 / 托管暂停 / 旧档迁移 / 继承
import {importTS} from './test-loader.mjs';
const {createGame,perform,events,steps}=await importTS('lib/game.ts');
const {storyCards}=await importTS('lib/region-arcs.ts');
const {onStoryQueued,advanceWorldStory,compileStoryEvents}=await importTS('lib/story-engine.ts');
const {defaultWorldStory,normalizeWorldStory}=await importTS('lib/story-state.ts');
const {seedStoryNpcs,allStoryNpcIds}=await importTS('lib/story-npcs.ts');
const {hostedStep}=await importTS('lib/hosting.ts');
let pass=0,fail=0;
const check=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const d=Object.fromEntries(steps.map(s=>[s.key,s.options[0]]));Object.assign(d,{name:'测试',gender:'男',age:'成年 · 适龄',education:'私塾启蒙',wealth:'温饱',potential:'平凡',region:'暮林边境'});

// ---- 1. 事件库结构 ----
const mistEvents=events.filter(e=>e.id.startsWith('mist-door-'));
check(mistEvents.length===8,'暮林 8 张事件卡已编译入事件库');
check(storyCards.length===49,'storyCards 共 49 张（暮林8+五国各5+关系13+碎冠3）');
check(events.every(e=>!e.id.startsWith('farmer-')&&!e.id.startsWith('knight-')),'原职业剧情已全部移除');
check(events.filter(e=>e.kind.startsWith('剧情 ·')).length===36,'36 个剧情事件（五国25+暮林8+碎冠3）');
check(events.filter(e=>e.kind.startsWith('关系 ·')).length===13,'13 个NPC关系事件');
const fiveArcs=['loen-tax','castia-eagle','north-oath','alma-ports','holy-candle'];
for(const a of fiveArcs)check(events.filter(e=>e.id.startsWith(a+'-')).length===5,'['+a+'] 5 张事件卡已编译（3-5阶段齐全）');

// ---- 2. 卡1 触发与分支 ----
let s=createGame(d);
check(s.region===5,'测试档位于暮林边境');
check(!!s.worldStory&&!!s.worldStory.arcs['mist-door'],'新档含 mist-door 弧线状态');
check(s.worldStory.arcs['mist-door'].phase===0,'弧线初始 phase=0');
check(Object.keys(s.worldStory.npcs).length>=allStoryNpcIds.length,'新档已播种全部核心 NPC');
// 轮询应能挂上卡1（region 5 & phase 0）
let got1=false;
for(let i=0;i<12&&!got1;i++){const r=perform(s,'work');s=r.state;got1=s.event==='mist-door-1';}
check(got1,'模拟劳作会挂出卡1「雾根蘑菇失色」');
// 选择A：采样调查
if(s.event==='mist-door-1'){
  const r=perform(s,'event','0');
  check(!r.error,'卡1 选择A可执行');
  check(r.state.worldStory.arcs['mist-door'].flags['mist-clue']===true,'选择A写入 mist-clue');
  check(r.state.worldStory.arcs['mist-door'].knowledge>=10,'弧线 knowledge 提升');
  check(r.state.worldStory.npcs['mist-tess'].trust>=16,'苔丝信任提升');
  s=r.state;
} else { check(false,'无法推进卡1'); s=perform(s,'event','0').state; }

// ---- 3. 卡2 触发条件与截止 ----
check(s.worldStory.arcs['mist-door'].phase===1,'卡1 后 phase=1');
let got2=false;
for(let i=0;i<12&&!got2;i++){const r=perform(s,'work');s=r.state;got2=s.event==='mist-door-2';}
check(got2,'有线索后挂出卡2「失踪的采药人」');
// 注册截止并验证过期结算
onStoryQueued(s,'mist-door-2');
check(s.worldStory.arcs['mist-door'].deadlines['lydia']>s.day,'卡2 出现即注册 10 日截止');
// 直接快进超过截止
let s2={...s}; s2.day=s.day+12;
const expired=advanceWorldStory(s2,12);
check(s2.worldStory.npcs['mist-lydia'].alive===false,'逾期未救：莉亚死亡');
check(expired.some(x=>x.includes('莉亚在林中遇难')),'逾期日志写入');
check(s2.worldStory.arcs['mist-door'].danger>10,'逾期危险上升');
// 正常选择A救回（新档）
let s3=createGame(d);s3.region=5;
s3.worldStory.arcs['mist-door'].phase=1;s3.worldStory.arcs['mist-door'].flags['mist-clue']=true;
s3.event='mist-door-2';
const r3=perform(s3,'event','0');
check(!r3.error,'卡2 选择A可执行');
check(r3.state.worldStory.npcs['mist-lydia'].alive!==false,'选择A：莉亚存活');
check(r3.state.worldStory.arcs['mist-door'].flags['mist-entrance']===true,'选择A：入口线索 mist-entrance');
check(r3.state.worldStory.arcs['mist-door'].phase===2,'卡2 后 phase=2');
s3=r3.state;

// ---- 4. 卡3 阵营抉择 → 托管应暂停 ----
s3.worldStory.arcs['mist-door'].phase=2;
s3.event='mist-door-3';
const h=hostedStep({...s3,hosting:{action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,active:true,completed:0,reason:''}});
check(h.error&&String(h.error).includes('剧情分叉'),'托管遇到卡3 阵营抉择自动暂停');
const r4=perform(s3,'event','0');
check(!r4.error,'卡3 选择A可执行');
check(r4.state.worldStory.arcs['mist-door'].flags['mist-side-watcher']===true,'卡3 写入 mist-side-watcher');
s3=r4.state;

// ---- 5. 卡4 同行者 ----
s3.worldStory.arcs['mist-door'].phase=3;
s3.event='mist-door-4';
const r5=perform(s3,'event','1');
check(!r5.error,'卡4 选择B可执行');
check(r5.state.worldStory.arcs['mist-door'].flags['mist-party-scholar']===true,'卡4 写入 mist-party-scholar');
check(r5.state.worldStory.arcs['mist-door'].knowledge>=28,'学者同行 knowledge 提升');
s3=r5.state;

// ---- 6. 卡5 不可逆 ----
s3.skills.元素=100;s3.skills.潜行=100;s3.attributes.感知=80;s3.attributes.智力=80;
s3.worldStory.arcs['mist-door'].phase=4;
let gotSword=false;
for(let t=0;t<20&&!gotSword;t++){
  s3.event='mist-door-5';
  const r=perform(s3,'event','1'); // 取走核心
  if(!r.error&&r.state.worldStory.arcs['mist-door'].flags['mist-core']&&r.state.items.some(i=>i.name==='霜陨剑'))gotSword=true;
  s3=r.state;
}
check(gotSword,'卡5 取走核心（mist-core 写入）');
check(s3.items.some(i=>i.name==='霜陨剑'),'取走核心奖励 霜陨剑 入库');
s3.worldStory.arcs['mist-door'].phase=4;

// ---- 7. 卡6 遗物归属 ----
s3.worldStory.arcs['mist-door'].phase=4;
s3.event='mist-door-6';
const r7=perform(s3,'event','2');
check(!r7.error,'卡6 选择C可执行');
check(r7.state.worldStory.arcs['mist-door'].flags['mist-artifact-watcher']===true,'卡6 写入 mist-artifact-watcher');
s3=r7.state;

// ---- 8. 卡7 林缘 ----
s3.worldStory.arcs['mist-door'].phase=5;
s3.event='mist-door-7';
const r8=perform(s3,'event','0');
check(!r8.error,'卡7 选择A可执行');
check(r8.state.worldStory.arcs['mist-door'].flags['mist-rescue']===true,'卡7 写入 mist-rescue');
s3=r8.state;

// ---- 9. 卡8 终局 ----
s3.worldStory.arcs['mist-door'].phase=5;
s3.event='mist-door-8';
const r9=perform(s3,'event','0');
check(!r9.error,'卡8 选择A可执行');
check(r9.state.worldStory.arcs['mist-door'].flags['mist-truth-public']===true,'卡8 写入 mist-truth-public');
check(r9.state.worldStory.arcs['mist-door'].history.includes('mist-door-8'),'卡8 记入 history');
check(r9.state.worldStory.arcs['mist-door'].phase===5,'终局后 phase=5');

// ---- 10. 旧档迁移 ----
const legacy={version:1,id:'x',draft:{name:'旧档',gender:'男',region:'暮林边境',race:'人类',age:'成年 · 适龄',personality:'谨慎',education:'私塾启蒙',wealth:'温饱',potential:'平凡',family:'独自成长',childhood:'田间帮工',social:'独来独往',goal:'平凡一生'},day:0,ageStart:18,region:5,birthRegion:5,job:0,rank:0,seed:1,turn:0,hp:100,stamina:100,spirit:100,mana:0,maxMana:0,hunger:0,injury:0,cash:100,debt:0,debtDue:0,attributes:{力量:10,敏捷:10,体质:10,智力:10,感知:10,意志:10,魅力:10,幸运:10},skills:{},items:[],npcs:[],quests:[],fame:[0,0,0,0,0,0],crime:0,estates:[],spouse:null,children:[],known:[5],event:null,seen:{},storyFlags:{},log:[],mode:'中等',dead:false,retired:false,generation:1,heir:false,equip:{},battle:null,fate:null,fateDone:false,clearedDungeons:[]};
const migrated=await importTS('lib/game.ts').then(m=>m.normalizeSave(structuredClone(legacy)));
check(!!migrated.worldStory&&!!migrated.worldStory.arcs['mist-door'],'旧档迁移：补默认 worldStory');
check(Object.keys(migrated.worldStory.npcs).length>=allStoryNpcIds.length,'旧档迁移：播种核心 NPC');

// ---- 11. 继承 ----
const {inherit}=await importTS('lib/game.ts');
let sI=createGame(d);
sI.worldStory.arcs['mist-door'].phase=3;
sI.worldStory.arcs['mist-door'].flags['mist-clue']=true;
sI.worldStory.npcs['mist-tess'].trust=70;
sI.worldStory.npcs['mist-tess'].affinity=60;
sI.children.push({name:'小嗣',born:sI.day-360*20});
sI.dead=true;
const child=inherit(sI);
check(!!child&&!!child.worldStory,'继承：worldStory 被继承');
check(child.worldStory.arcs['mist-door'].phase===3,'继承：弧线阶段保留');
check(child.worldStory.arcs['mist-door'].flags['mist-clue']===true,'继承：弧线旗标保留');
check(child.worldStory.npcs['mist-tess'].trust===35,'继承：NPC 信任按半继承');
check(child.worldStory.npcs['mist-tess'].affinity===30,'继承：NPC 亲近按半继承');

// ---- 12. 重复不触发（seen 去重）----
let sR=createGame(d);sR.region=5;
sR.seen['mist-door-1']=sR.day;
let gotAgain=false;
for(let i=0;i<10&&!gotAgain;i++){const r=perform(sR,'work');sR=r.state;if(sR.event==='mist-door-1')gotAgain=true;}
check(!gotAgain,'卡1 完成后不再重复出现（seen 去重）');

// ---- 13. 其余五国第一阶段（圣经 §11.9 轮8）----
const five=[['loen-tax','loen-tax-1','loen-tax-2',0,'loen-hermann'],['castia-eagle','castia-eagle-1','castia-eagle-2',1,'castia-elena'],['north-oath','north-oath-1','north-oath-2',2,'north-bran'],['alma-ports','alma-ports-1','alma-ports-2',3,'alma-maira'],['holy-candle','holy-candle-1','holy-candle-2',4,'holy-clara']];
for(const [arc,c1,c2,region,npcKey] of five){
  let s=createGame(d);s.region=region;
  check(!!events.find(e=>e.id===c1)&&!!events.find(e=>e.id===c2),'['+arc+'] 两卡在事件库');
  check(s.worldStory.arcs[arc].phase===0,'['+arc+'] 弧线初始 phase=0');
  let got=false;
  for(let i=0;i<18&&!got;i++){const r=perform(s,'work');s=r.state;got=s.event===c1;}
  check(got,'['+arc+'] 轮询可挂出卡1');
  if(got){
    const r=perform(s,'event','0');
    check(!r.error,'['+arc+'] 卡1 选择A可执行');
    check(r.state.worldStory.arcs[arc].phase>=1,'['+arc+'] 卡1 推进 phase>=1');
    check(r.state.worldStory.arcs[arc].history.includes(c1),'['+arc+'] 卡1 记入 history');
    s=r.state;
  } else { s=perform(s,'event','0').state; }
  // 卡2 触发条件（卡1 flag + phase>=1 已满足）
  let got2=false;
  for(let i=0;i<18&&!got2;i++){const r=perform(s,'work');s=r.state;got2=s.event===c2;}
  check(got2,'['+arc+'] 卡1 后轮询可挂出卡2');
  // 卡2 截止过期：世界自行推进
  const dk={'loen-tax':'loen-evict','castia-eagle':'castia-check','north-oath':'north-pass','alma-ports':'alma-run','holy-candle':'holy-burn'}[arc];
  onStoryQueued(s,c2);
  check(s.worldStory.arcs[arc].deadlines[dk]>s.day,'['+arc+'] 卡2 注册截止日期');
  const before=s.worldStory.npcs[npcKey].trust;
  const tBefore=s.worldStory.arcs[arc].tension;
  let s2={...s};s2.day=s.day+12;
  advanceWorldStory(s2,12);
  check(s2.worldStory.npcs[npcKey].trust<before,'['+arc+'] 逾期后 '+npcKey+' 信任下降');
  check(s2.worldStory.arcs[arc].tension>tBefore,'['+arc+'] 逾期后 tension 上升');
  // 托管遇五国卡暂停
  s.event=c2;
  const h2=hostedStep({...s,hosting:{action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,active:true,completed:0,reason:''}});
  check(h2.error&&String(h2.error).includes('剧情分叉'),'['+arc+'] 托管遇卡2 自动暂停');
}
// 五国卡2 的选择也能正常结算（洛恩卡2 为例）
{
  let s=createGame(d);s.region=0;
  s.worldStory.arcs['loen-tax'].phase=1;s.worldStory.arcs['loen-tax'].flags['loen-audit']=true;
  s.event='loen-tax-2';
  const r=perform(s,'event','0');
  check(!r.error,'洛恩卡2 选择A可执行');
  check(r.state.worldStory.arcs['loen-tax'].flags['loen-ledger']===true,'洛恩卡2 写入 loen-ledger');
  check(r.state.worldStory.arcs['loen-tax'].phase===2,'洛恩卡2 推进 phase=2');
  check(r.state.worldStory.npcs['loen-bella'].trust>=0,'洛恩卡2 NPC 关系落账');
}

// ---- 14. 其余五国第二/三阶段（卡3-5 闭环：对抗→抉择→余波）----
const five3=[['loen-tax','loen-ledger','loen-side-guild','loen-open','crown-clue-loen'],['castia-eagle','castia-medic','castia-side-army','castia-pursuit','crown-clue-castia'],['north-oath','north-mediate','north-side-freeze','north-migrate','crown-clue-north'],['alma-ports','alma-reopen','alma-side-council','alma-credit','crown-clue-alma'],['holy-candle','holy-rescue','holy-side-clara','holy-truth-heal','crown-clue-holy']];
for(const [arc,c2f,c3f,c4f,crownFlag] of five3){
  const region=five.find(f=>f[0]===arc)[3];
  let s=createGame(d);s.region=region;
  s.worldStory.arcs[arc].phase=2;s.worldStory.arcs[arc].flags[c2f]=true;
  let got3=false;
  for(let i=0;i<15&&!got3;i++){const r=perform(s,'work');s=r.state;got3=s.event===arc+'-3';}
  check(got3,'['+arc+'] 卡2后轮询可挂出卡3');
  if(got3){const r=perform(s,'event','0');check(!r.error&&r.state.worldStory.arcs[arc].phase>=3,'['+arc+'] 卡3 选A推进 phase>=3');s=r.state;}
  else{s=perform(s,'event','0').state;}
  let got4=false;
  for(let i=0;i<15&&!got4;i++){const r=perform(s,'work');s=r.state;got4=s.event===arc+'-4';}
  check(got4,'['+arc+'] 卡3后轮询可挂出卡4');
  if(got4){const r=perform(s,'event','0');check(!r.error&&r.state.worldStory.arcs[arc].phase>=4,'['+arc+'] 卡4 选A推进 phase>=4');s=r.state;}
  else{s=perform(s,'event','0').state;}
  let got5=false;
  for(let i=0;i<15&&!got5;i++){const r=perform(s,'work');s=r.state;got5=s.event===arc+'-5';}
  check(got5,'['+arc+'] 卡4后轮询可挂出卡5');
  if(got5){
    const r=perform(s,'event','0');
    check(!r.error&&r.state.worldStory.arcs[arc].phase===5,'['+arc+'] 卡5 选A收束 phase=5');
    check(!!r.state.worldStory.arcs[arc].dominantFaction,'['+arc+'] 卡5 写入主导势力');
    check(r.state.worldStory.arcs[arc].flags[crownFlag]===true,'['+arc+'] 卡5 写入碎冠线索 '+crownFlag);
  }
}
// 卡3 截止过期：洛恩卡3 为例
{
  let s=createGame(d);s.region=0;
  s.worldStory.arcs['loen-tax'].phase=2;s.worldStory.arcs['loen-tax'].flags['loen-ledger']=true;
  for(let i=0;i<15;i++){const r=perform(s,'work');s=r.state;if(s.event==='loen-tax-3')break;}
  onStoryQueued(s,'loen-tax-3');
  const t0=s.worldStory.arcs['loen-tax'].tension;
  let s2={...s};s2.day=s.day+12;
  advanceWorldStory(s2,12);
  check(s2.worldStory.arcs['loen-tax'].tension>t0,'洛恩卡3 逾期后 tension 上升');
}

// ---- 15. NPC 个人关系事件（§4）----
const npcShort={'loen-bella':'bella','loen-simon':'simon','castia-varian':'varian','castia-elena':'elena','north-hilda':'hilda','north-bran':'bran','alma-maira':'maira','alma-kalo':'kalo','holy-clara':'clara','holy-rosa':'rosa','mist-tess':'tess','mist-elin':'elin','mist-moore':'moore'};
const npcCases=[['loen-bella',0],['loen-simon',0],['castia-varian',1],['castia-elena',1],['north-hilda',2],['north-bran',2],['alma-maira',3],['alma-kalo',3],['holy-clara',4],['holy-rosa',4],['mist-tess',5],['mist-elin',5],['mist-moore',5]];
for(const [npcId,region] of npcCases){
  let s=createGame(d);s.region=region;
  // 抬高地区弧线 phase（无 flag），排除地区卡抢占轮询，只剩关系事件
  const arcIds=['loen-tax','castia-eagle','north-oath','alma-ports','holy-candle','mist-door'];
  s.worldStory.arcs[arcIds[region]].phase=2;
  const n=s.worldStory.npcs[npcId];
  const isTrust=npcId==='loen-simon'||npcId==='castia-varian'||npcId==='north-bran'||npcId==='alma-maira'||npcId==='holy-clara'||npcId==='mist-elin';
  const isInterest=npcId==='mist-moore';
  if(isTrust)n.trust=60;else if(isInterest)n.interest=60;else n.affinity=65;
  const evId='npc-'+npcShort[npcId];
  let got=false;
  for(let i=0;i<15&&!got;i++){const r=perform(s,'work');s=r.state;got=s.event===evId;}
  check(got,npcId+' 关系达标后轮询可挂出个人事件');
  if(got){
    const before=s.worldStory.npcs[npcId].relationship;
    const r=perform(s,'event','0');
    check(!r.error,npcId+' 个人事件选A可执行');
    check(r.state.worldStory.npcs[npcId].relationship!=='陌生'||before!=='陌生',npcId+' 关系已升级（'+r.state.worldStory.npcs[npcId].relationship+'）');
  } else { s=perform(s,'event','0').state; }
}

// ---- 16. 碎冠之夜跨区终局（§2/§7.2 卡8 汇合）----
{
  let s=createGame(d);s.region=0;
  s.worldStory.arcs['loen-tax'].phase=4;s.worldStory.arcs['castia-eagle'].phase=4;
  let got=false;
  for(let i=0;i<15&&!got;i++){const r=perform(s,'work');s=r.state;got=s.event==='crown-1';}
  check(got,'两条地区线到 phase4 后跨区可挂出 碎冠之夜卡1');
  if(got){
    const r=perform(s,'event','0');
    check(!r.error&&r.state.worldStory.arcs['crown-night'].phase>=1,'碎冠卡1 选A推进');
    check(r.state.worldStory.arcs['crown-night'].flags['crown-probe']===true,'碎冠卡1 写入 crown-probe');
    s=r.state;
  } else { s=perform(s,'event','0').state; }
  s.worldStory.arcs['north-oath'].phase=4;
  let got2=false;
  for(let i=0;i<15&&!got2;i++){const r=perform(s,'work');s=r.state;got2=s.event==='crown-2';}
  check(got2,'三条线 phase4 后挂出碎冠卡2');
  if(got2){const r=perform(s,'event','0');check(!r.error&&r.state.worldStory.arcs['crown-night'].phase>=2,'碎冠卡2 选A推进');s=r.state;}
  else{s=perform(s,'event','0').state;}
  s.worldStory.arcs['alma-ports'].phase=4;s.worldStory.arcs['holy-candle'].phase=4;
  let got3=false;
  for(let i=0;i<15&&!got3;i++){const r=perform(s,'work');s=r.state;got3=s.event==='crown-3';}
  check(got3,'四条线 phase4 后挂出碎冠卡3');
  if(got3){
    const r=perform(s,'event','0');
    check(!r.error&&r.state.worldStory.arcs['crown-night'].phase===3,'碎冠卡3 选A收束 phase=3');
    check(!!r.state.worldStory.arcs['crown-night'].dominantFaction,'碎冠卡3 写入主导势力');
  }
}
// 碎冠之夜弧线可迁移（额外弧线保留）
{
  const ws=defaultWorldStory();
  ws.arcs['crown-night']={id:'crown-night',phase:2,tension:40,scarcity:20,danger:30,knowledge:25,dominantFaction:null,flags:{'crown-probe':true},deadlines:{},history:['crown-1']};
  const m=normalizeWorldStory(JSON.parse(JSON.stringify({arcs:ws.arcs,npcs:{}})),allStoryNpcIds);
  check(m.arcs['crown-night']&&m.arcs['crown-night'].phase===2,'碎冠之夜弧线在存档迁移后保留');
  check(m.arcs['crown-night'].flags['crown-probe']===true,'碎冠之夜旗标迁移保留');
}

// ---- 17. 截止过期的事件不再重复挂出 ----
{
  let s=createGame(d);s.region=0;
  s.worldStory.arcs['loen-tax'].phase=2;s.worldStory.arcs['loen-tax'].flags['loen-ledger']=true;
  s.worldStory.arcs['loen-tax'].history.push('loen-tax-2:expire');
  let got=false;
  for(let i=0;i<15&&!got;i++){const r=perform(s,'work');s=r.state;if(s.event==='loen-tax-2')got=true;}
  check(!got,'截止过期的事件不再重复挂出');
}
// 过期收场也推进弧线（同卡3 过期张力）
{
  let s=createGame(d);s.region=0;
  s.worldStory.arcs['loen-tax'].phase=2;s.worldStory.arcs['loen-tax'].flags['loen-ledger']=true;
  onStoryQueued(s,'loen-tax-2');
  const t0=s.worldStory.arcs['loen-tax'].tension;
  let s2={...s};s2.day=s.day+12;
  advanceWorldStory(s2,12);
  check(s2.worldStory.arcs['loen-tax'].history.includes('loen-tax-2:expire'),'卡2 过期标记写入 history');
  check(s2.worldStory.arcs['loen-tax'].tension>t0,'卡2 逾期推进世界（张力上升）');
}

console.log(`\n世界剧情测试: ${pass} PASS / ${fail} FAIL`);
process.exit(fail?1:0);
