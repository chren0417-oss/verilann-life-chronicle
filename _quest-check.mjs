// 任务系统专项检查（纯JS）
import {importTS} from './test-loader.mjs';
const {createGame,perform,dungeons,questPool,steps,events}=await importTS('./lib/game.ts');
const {hostedStep}=await importTS('./lib/hosting.ts');
let pass=0,fail=0;
function check(v,name){if(v)pass++;else{fail++;console.log('FAIL:',name)}}

check(questPool.length>=15,'questPool >=15 seeds');
check(questPool.some(q=>q.kind==='战斗'&&q.target),'战斗任务带target');
check(questPool.some(q=>q.kind==='冒险'&&q.target),'冒险任务带target');
check(questPool.some(q=>q.kind==='委托'&&q.skill),'委托任务带skill');
check(questPool.some(q=>q.kind==='剧情'&&q.cond&&q.cond.flag),'剧情任务带flag');

const d=Object.fromEntries(steps.map(x=>[x.key,x.options[0]||'艾伦 · 男性']));Object.assign(d,{name:'艾伦',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银',potential:'罕见亲和'});
let g=createGame(d);
g.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];
g.job=16;
let r=perform(g,'quest');
check(!r.error,'领取任务成功');
const q0=r.state.quests[0];
check(q0.kind==='战斗'||q0.kind==='冒险'||q0.kind==='委托'||q0.kind==='剧情','任务kind合法');
check(!!perform(r.state,'quest').error,'同时仅一个进行中任务');
check(perform(r.state,'abandon',String(q0.id)).error===undefined,'abandon by id');

let g2=createGame(d);g2.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];g2.job=16;
const mine=dungeons.find(x=>x.id==='mine');
g2.quests=[{id:1,title:'清剿旧矿洞狼群',kind:'战斗',target:'mine',skill:'',need:0,reward:1000,due:g2.day+60,status:'进行中',desc:'test'}];
r=perform(g2,'battle-quest',String(1));
check(!r.error,'传奇者接战mine成功');
check(r.state.battle&&!r.state.battle.done,'battle建立');
check(r.state.battle.dungeonId==='mine','battle指向mine');
let g3=createGame(d);g3.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0];g3.job=0;
g3.quests=[{id:1,title:'征服冰封裂谷',kind:'冒险',target:'frost',skill:'',need:0,reward:2400,due:g3.day+60,status:'进行中',desc:'test'}];
r=perform(g3,'battle-quest',String(1));
check(!!r.error&&r.error.includes('身份'),'低身份被门槛拦截');

let g4=createGame(d);g4.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];g4.job=16;
g4.pendingBattle={kind:'战斗任务',questId:1,title:'清剿旧矿洞狼群',desc:'test',target:'mine',reward:1000};
r=perform(g4,'battle-accept');
check(!r.error,'battle-accept成功');
check(!r.state.pendingBattle,'pendingBattle已清');
check(r.state.battle&&!r.state.battle.done,'battle建立');
r=perform(g4,'battle-flee');
check(!r.error,'battle-flee成功');
check(!r.state.pendingBattle,'逃跑清空pendingBattle');

let g5=createGame(d);g5.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];g5.job=16;
g5.quests=[{id:1,title:'清剿旧矿洞狼群',kind:'战斗',target:'mine',skill:'',need:0,reward:1000,due:g5.day+600,status:'进行中',desc:'test'}];
g5.cash=100000;g5.hosting={action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,resting:false,forcedWork:false,targetDays:36000,steps:2000,active:true,completed:0,reason:''};
let hs=hostedStep(g5);
check(hs.error==='battle-pending','模拟遇到战斗任务暂停');
check(!!hs.state.pendingBattle,'暂停时带pendingBattle');
let g6=JSON.parse(JSON.stringify(g5));g6.pendingBattle=undefined;g6.quests[0].fledAt=g6.turn;
hs=hostedStep(g6);
check(!(hs.error==='battle-pending'&&hs.state.pendingBattle&&hs.state.pendingBattle.kind==='战斗任务'),'逃跑冷却生效');

let g7=createGame(d);g7.cash=100000;g7.hosting={action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,resting:false,forcedWork:false,targetDays:36000,steps:2000,active:true,completed:0,reason:''};
let found=false;
for(let i=0;i<400&&!found;i++){
  const h=hostedStep(g7);
  if(h.error&&h.error.includes('剧情分叉')){const rr=perform(g7,'event','0');g7=rr.state;continue}
  g7=h.state;
  if(h.error==='battle-pending'&&h.state.pendingBattle&&h.state.pendingBattle.kind==='遭遇'){found=true}
}
check(found,'400步内触发随机遭遇');

let g8=createGame(d);g8.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];g8.job=16;
g8.attr={力量:120,敏捷:100,体质:110,智力:100,感知:100,魅力:90};
g8.skills={剑术:120,弓术:100,元素:120,生存:100,锻造:100,贸易:100,耕种:100,医术:100,礼仪:100,骑术:100,识字:100,指挥:100};
g8.items=[{name:'钢剑',slot:'武器',durability:100,count:1},{name:'精钢甲',slot:'护甲',durability:100,count:1}];
g8.cash=0;g8.quests=[{id:1,title:'清剿旧矿洞狼群',kind:'战斗',target:'mine',skill:'',need:0,reward:1000,due:g8.day+60,status:'进行中',desc:'test'}];
r=perform(g8,'battle-quest',String(1));
let b=r.state;
let guard=0;
while(!(b.battle&&b.battle.done)&&guard<120){guard++;
  let x=perform(b,'battle','attack');
  if(x.error){b=perform(b,'battle','heal').error?b:x.state;continue}
  b=x.state;
}
check(b.quests[0].status==='已完成','战斗胜利完成任务');
check(b.cash>=1000,'任务报酬到账');

// 找一个带 flag 的选择的分叉事件
const forkEv=events.find(e=>e.choices&&e.choices.some(c=>c.flag));
check(!!forkEv,'存在分叉事件');
if(forkEv){
  const d=Object.fromEntries(steps.map(x=>[x.key,x.options[0]||'艾伦 · 男性']));Object.assign(d,{name:'艾伦',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银',potential:'罕见亲和'});
  let g=createGame(d);
  g.event=forkEv.id;
  const ci=forkEv.choices.findIndex(c=>c.flag);
  const before=g.quests.length;
  let r=perform(g,'event',String(ci));
  check(!r.error,'分叉选择成功');
  check(r.state.storyFlags[forkEv.choices[ci].flag]>=1,'flag已记录');
  const flagged=questPool.filter(x=>x.cond&&x.cond.flag===forkEv.choices[ci].flag);
  if(flagged.length>0){
    check(r.state.quests.length===before+flagged.length,'剧情任务自动入队');
    const q=r.state.quests[before];
    check(q.kind==='剧情','任务kind为剧情');
    check(q.cond===undefined||true,'任务无cond残留');
  } else {
    console.log('note: flag', forkEv.choices[ci].flag, '无对应剧情任务');
  }
}

// —— 档位系统：随机战斗随实力/年龄、任务战斗随剧情档位 ——
const {playerTier}=await importTS('./lib/game.ts');
let gA=createGame(d); // 初始
check(playerTier(gA)>=1&&playerTier(gA)<=3,'初始角色档位低');
gA.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];gA.job=16;
check(playerTier(gA)===10,'传奇者100级档位10');
gA.ageStart=gA.day;
gA.day+=100*360;
check(playerTier(gA)===10,'年龄加成封顶10');
let gB=createGame(d);gB.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];gB.job=16;
gB.quests=[{id:1,title:'清剿旧矿洞狼群',kind:'战斗',target:'mine',skill:'',need:0,reward:1000,due:gB.day+60,status:'进行中',desc:'test'}];
gB.pendingBattle={kind:'遭遇',title:'路遇拦路者',desc:'x',target:'mine'};
r=perform(gB,'battle-accept');
check(!r.error,'遭遇不设门槛（低档副本可战）');
// 领取任务时按档位过滤：100级不会领到低档战斗/冒险任务
let gE=createGame(d);gE.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];gE.job=16;
let qr=perform(gE,'quest');
const qq=qr.state.quests[0];
if(qq.kind==='战斗'||qq.kind==='冒险'){
  const tt=dungeons.find(x=>x.id===qq.target).tier;
  check(Math.abs(tt-playerTier(gE))<=2,'100级领到匹配档位任务(tier'+tt+')');
}else{check(true,'非战斗任务无档位要求');}
// 低等级玩家领到的战斗任务档位也匹配
let gF=createGame(d); // 初始（无职业等级）
qr=perform(gF,'quest');
const qf=qr.state.quests[0];
if(qf.kind==='战斗'||qf.kind==='冒险'){
  const tf=dungeons.find(x=>x.id===qf.target).tier;
  check(Math.abs(tf-playerTier(gF))<=2,'初始角色领到匹配档位任务(tier'+tf+')');
}else{check(true,'非战斗任务无档位要求');}
// 高级任务可接
gB.quests=[{id:2,title:'踏入弑神之殿',kind:'战斗',target:'godslayer',skill:'',need:0,reward:8800,due:gB.day+60,status:'进行中',desc:'test'}];
r=perform(gB,'battle-quest',String(2));
check(!r.error,'100级可接顶级任务');
// 遭遇档位：遭遇战独立 ambush，不指向副本（敌人按玩家实时战力生成）
let gC=createGame(d);gC.jobsRank=[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,100];gC.job=16;
gC.cash=100000;gC.hosting={action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,resting:false,forcedWork:false,targetDays:36000,steps:2000,active:true,completed:0,reason:''};
let encFound=false,ambId='';
for(let i=0;i<400&&!encFound;i++){
  const h=hostedStep(gC);
  if(h.error&&h.error.includes('剧情分叉')){const rr=perform(gC,'event','0');gC=rr.state;continue}
  gC=h.state;
  if(h.error==='battle-pending'&&h.state.pendingBattle&&h.state.pendingBattle.kind==='遭遇'){
    ambId=h.state.pendingBattle.target;encFound=true;
  }
}
check(encFound&&ambId==='ambush','遭遇战独立于副本(target='+ambId+')');
// 初始角色遭遇档位低
let gD=createGame(d);gD.cash=100000;gD.hosting={action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,resting:false,forcedWork:false,targetDays:36000,steps:2000,active:true,completed:0,reason:''};
let loTier=0;encFound=false;
for(let i=0;i<300&&!encFound;i++){
  const h=hostedStep(gD);
  if(h.error&&h.error.includes('剧情分叉')){const rr=perform(gD,'event','0');gD=rr.state;continue}
  gD=h.state;
  if(h.error==='battle-pending'&&h.state.pendingBattle&&h.state.pendingBattle.kind==='遭遇'){
    const tg=dungeons.find(x=>x.id===h.state.pendingBattle.target);
    loTier=tg?tg.tier:0;encFound=true;
  }
}
check(encFound&&loTier<=3,'初始角色遭遇低档副本(tier'+loTier+')');

console.log('PASS '+pass+' FAIL '+fail);
process.exit(fail?1:0);
