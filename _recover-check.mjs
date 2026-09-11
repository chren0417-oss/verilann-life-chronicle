// 恢复/胜利结算单测
import {importTS} from './test-loader.mjs';
const {createGame,perform} = await importTS('lib/game.ts');
const {hostedStep} = await importTS('lib/hosting.ts');
const fs = (await import('node:fs'));
let pass=0, fail=0;
const check=(c,msg)=>{if(c){pass++;console.log('PASS',msg)}else{fail++;console.log('FAIL',msg)}};
const raw = JSON.parse(fs.readFileSync('C:/Users/102251/Documents/维尔兰人生模拟器-完整版/cundang/latest.json','utf8'));

// 1) 剧情 fixed 敌人：battle-accept 用固定强度
let g=JSON.parse(JSON.stringify(raw));g.battle=null;g.event=null;
g.pendingBattle={kind:'遭遇',title:'试炼之影',desc:'剧情测试',target:'ambush',fixed:{name:'黑铁骑士',hp:3000,atk:120,def:90}};
let r=perform(g,'battle-accept','');
check(!r.error,'剧情固定敌人接受');
check(r.state.battle.mname==='黑铁骑士'&&r.state.battle.hp===3000&&r.state.battle.atk===120&&r.state.battle.def===90,'固定强度生效('+r.state.battle.mname+' '+r.state.battle.hp+'/'+r.state.battle.atk+'/'+r.state.battle.def+')');

// 2) 随机遭遇：动态敌人（非固定）
let g2=JSON.parse(JSON.stringify(raw));g2.battle=null;g2.event=null;
g2.pendingBattle={kind:'遭遇',title:'路遇拦路者',desc:'x',target:'ambush'};
r=perform(g2,'battle-accept','');
check(!r.error&&r.state.battle.dungeonId==='ambush','遭遇动态敌人');

// 3) battle-won-pending：模拟中 battle done&&won → 暂停等选择
let g3=JSON.parse(JSON.stringify(raw));g3.battle=null;g3.event=null;
g3.battle={dungeonId:'ambush',stage:0,hp:0,maxHp:100,atk:10,def:10,mname:'x',log:[],turn:1,done:true,won:true};
g3.hosting={action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,staminaRecoverTo:null,hpRecoverTo:null,resting:false,forcedWork:false,steps:2000,targetDays:36000,active:true,completed:0,recovering:false,reason:''};
let h=hostedStep(g3);
check(h.error==='battle-won-pending','胜利后暂停等选择('+h.error+')');
check(h.state.hosting.active===true,'胜利后模拟保持等待状态');

// 4) battle-lost：模拟停止
let g4=JSON.parse(JSON.stringify(raw));g4.battle=null;g4.event=null;
g4.battle={dungeonId:'ambush',stage:0,hp:0,maxHp:100,atk:10,def:10,mname:'x',log:[],turn:1,done:true,won:false};
g4.hosting={...g3.hosting};
h=hostedStep(g4);
check(h.error==='battle-lost','失败后停止模拟('+h.error+')');
check(h.state.hosting.active===false,'失败后 active=false');

// 5) 恢复分支：hp/stamina 回升，day+1
let g5=JSON.parse(JSON.stringify(raw));g5.battle=null;g5.event=null;
g5.hp=Math.floor(g5.hp*0.3);g5.stamina=10;g5.injury=50;
g5.hosting={...g3.hosting,recovering:true,active:true};
const before={day:g5.day,hp:g5.hp,stamina:g5.stamina,injury:g5.injury};
h=hostedStep(g5);
check(h.error===undefined||h.error==='battle-pending','恢复步无异常('+h.error+')');
check(h.state.day===before.day+1,'恢复消耗一天');
if(h.state.pendingBattle){check(h.state.pendingBattle.kind==='遭遇'||h.state.pendingBattle.kind==='战斗任务','恢复中遭遇提示('+h.state.pendingBattle.title+')');}
else{check(h.state.hp>before.hp&&h.state.stamina>before.stamina,'恢复回升(hp '+before.hp+'→'+h.state.hp+', 体力 '+before.stamina+'→'+h.state.stamina+')');
check(h.state.injury<before.injury,'伤势减轻('+before.injury+'→'+h.state.injury+')');}

// 6) 恢复完成 → 转正常
let g6=JSON.parse(JSON.stringify(raw));g6.battle=null;g6.event=null;
g6.hp=Math.floor(g6.hp*0.6);g6.stamina=Math.floor(g6.stamina*0.6);g6.injury=5;
g6.hosting={...g3.hosting,recovering:true,active:true};
let h6=hostedStep(g6);
let full=false;
for(let i=0;i<5&&!full;i++){
  if(h6.state.pendingBattle)break;
  full=h6.state.hosting?.recovering===false&&!h6.error;
  if(!full)h6=hostedStep(h6.state);
}
check(full||h6.state.pendingBattle,'恢复完成后转正常(或恢复中遭遇)');

console.log('\nPASS '+pass+' FAIL '+fail);
process.exit(fail?1:0);
