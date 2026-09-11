// 三选项 action 单测
import {importTS} from './test-loader.mjs';
const {createGame,perform} = await importTS('lib/game.ts');
const fs = (await import('node:fs'));
let pass=0, fail=0;
const check=(c,msg)=>{if(c){pass++;console.log('PASS',msg)}else{fail++;console.log('FAIL',msg)}};
const raw = JSON.parse(fs.readFileSync('C:/Users/102251/Documents/维尔兰人生模拟器-完整版/cundang/latest.json','utf8'));

const h={action:'work',temperament:'balanced',staminaBelow:null,hpBelow:null,staminaRecoverTo:null,hpRecoverTo:null,resting:false,forcedWork:false,steps:2000,targetDays:36000,active:true,completed:0,recovering:false,reason:''};
let g=JSON.parse(JSON.stringify(raw));
g.battle={dungeonId:'ambush',stage:0,hp:0,maxHp:100,atk:10,def:10,mname:'x',log:[],turn:1,done:true,won:true};
g.hosting={...h};

// continue
let r=perform(g,'battle-continue','');
check(!r.error&&r.state.battle===null&&r.state.hosting.active===true,'继续模拟：清battle+active');
// recover
r=perform(g,'battle-recover','');
check(!r.error&&r.state.battle===null&&r.state.hosting.active===true&&r.state.hosting.recovering===true,'恢复后继续：recovering=true');
// exit
r=perform(g,'battle-exit','');
check(!r.error&&r.state.battle===null&&r.state.hosting.active===false,'退出模拟：active=false');

// normalizeSave 保留 battle done（模拟重载场景）
const {normalizeSave} = await importTS('lib/game.ts');
const norm=normalizeSave(JSON.parse(JSON.stringify(g)));
check(norm.battle!==null&&norm.battle.done===true,'存档保留战斗结算');

console.log('\nPASS '+pass+' FAIL '+fail);
process.exit(fail?1:0);
