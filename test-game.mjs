import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {importTS} from './test-loader.mjs';
const {createGame,perform,validSave,normalizeSave,inherit,age,steps,events,jobs,difficulties,parseCommand,attr,jobTitle,rankName,expNeed,expGain,moveUnlocked,movePower,attrNames,moveCost,maxHp,maxStamina,maxSpirit,effectiveMaxMana}=await importTS('lib/game.ts');
const d=Object.fromEntries(steps.map(s=>[s.key,s.options[0]||'艾伦 · 男性']));Object.assign(d,{name:'艾伦',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银',potential:'罕见亲和'});
let checked=0;function check(v,msg){assert.ok(v,msg);checked++;}
let s=createGame(d);check(validSave(s),'new game passes validation');const first=structuredClone(s);let result=perform(s,'work');check(!result.error,'work succeeds');check(result.state.day===7,'work advances seven days');check(s.day===0&&s.cash===first.cash,'reducer leaves input untouched');check(result.state.cash>s.cash,'work income survives living expenses');s=result.state;
const before=JSON.stringify(s);result=perform(s,'train','不存在');check(!!result.error&&JSON.stringify(result.state)===before,'invalid actions have no state effects');
let poor=createGame({...d,wealth:'拮据 · 1银'});poor.cash=0;check(!!perform(poor,'buy','铁剑').error,'insufficient balance rejected');check(poor.items.length===3,'failed transaction does not add item');
const p=perform(s,'buy','黑面包').state;check(p.day===s.day&&p.items.find(i=>i.name==='黑面包').count===4,'shopping costs no day');check(p.cash===s.cash-6,'exact item charge');
const novice=createGame({...d,potential:'未显现'});check(!!perform(novice,'cast').error,'untrained magic rejected');check(!!perform(novice,'train','元素').error,'no potential blocks magic training');
const kid=createGame({...d,age:'童年 · 8岁'});check(!!perform(kid,'marry').error&&!!perform(kid,'job','1').error&&!!perform(kid,'estate').error,'child restrictions enforced');
const balances=Object.keys(difficulties).map(m=>perform(createGame(d,m),'work').state.cash);check(balances.every((v,i)=>i===0||v<balances[i-1]),'difficulty mechanically affects economics');
let e=createGame(d);e.event='wolf';e.seed=42;const autoW=perform(e,'work');check(!autoW.error,'training auto-resolves pending event');check(autoW.state.event===null&&autoW.state.day>=7,'event auto-resolved then work continued');const e1=perform(e,'event','0').state,e2=perform(e,'event','0').state;check(JSON.stringify(e1)===JSON.stringify(e2),'same state replays random outcome exactly');check(e1.event===null,'event resolved');
const archive=JSON.parse(JSON.stringify(e1));check(validSave(archive),'JSON round-trip valid');for(const bad of [{},{...archive,cash:-1},{...archive,region:99},{...archive,items:[{name:'a'}]},{...archive,skills:{}},{...archive,event:'missing'}])check(!validSave(bad),'malformed state rejected');
let q=createGame(d);q=perform(q,'quest').state;const count=q.quests.length;check(!!perform(q,'quest').error&&q.quests.length===count,'one active quest');check(!!perform(q,'deliver').error,'quest skill prerequisite');q.skills[q.quests[0].skill]=q.quests[0].need;q=perform(q,'deliver').state;check(q.quests[0].status==='已完成','quest completes');
let debt=perform(createGame(d),'borrow').state;check(debt.debt===1100,'loan records total repayment');debt=perform(debt,'repay').state;check(debt.debt===0,'repayment clears debt');
let long=createGame(d);long.cash=100000;for(let i=0;i<24;i++){long.event=null;long.injury=0;long.hp=100;long=perform(long,'year').state;check(validSave(long),'long life remains valid')};check(age(long)===42,'year fast-forward ages correctly');long.children=[{name:'希尔',born:0}];long.retired=true;const next=inherit(long);check(next&&next.day===long.day&&next.cash===long.cash&&next.generation===2,'inherit preserves world and assets');check(next&&validSave(next),'heir save valid');check(next.skills.锻造<long.skills.锻造,'heir does not copy veteran skills');
let many=createGame(d);many.cash=100000;for(let i=0;i<80;i++){if(many.event)many=perform(many,'event',String(events.find(e=>e.id===many.event).choices.length-1)).state;many=perform(many,i%3===0?'rest':'work').state;check(validSave(many),'repeated state remains valid')}
check(parseCommand('【属性】')[0]==='panel','panel command');check(parseCommand('训练 剑术')[1]==='剑术','training command');
// 多职业系统
let mc=createGame(d);mc.cash=1000000;check(mc.jobsRank&&mc.jobsRank.length===jobs.length,'jobsRank initialized');
check(jobs[0].name==='农民'&&jobs[5].name==='骑士','guard renamed knight, farmhand renamed farmer');
mc=perform(mc,'job','1').state;check(mc.job===1&&mc.jobsRank[1]===0,'switch to blacksmith starts untrained');
mc.skills['锻造']=35;mc=perform(mc,'promote').state;check(mc.jobsRank[1]===1,'blacksmith promoted');
mc=perform(mc,'job','5').state;check(mc.job===5&&mc.jobsRank[1]===1,'switching back keeps blacksmith rank');
check(!!perform(mc,'job','8').error,'advanced job locked until unlocked');
// 职业属性加成：仅当前职业生效，切换即切换
const attrBase=createGame(d);attrBase.job=5;attrBase.jobsRank[5]=1;const knightStr=attr(attrBase,'力量');attrBase.job=0;attrBase.jobsRank[0]=1;const farmerStr=attr(attrBase,'力量');check(knightStr>attrBase.attributes['力量']&&knightStr-farmerStr===2,'knight grants +3 strength, farmer +1: switching swaps bonus');
// 技能锻炼提升属性：剑术熟练度增长 -> 力量/体质
const skillTrain=createGame(d);skillTrain.skills['剑术']=0;const s0=attr(skillTrain,'力量');skillTrain.skills['剑术']=60;check(attr(skillTrain,'力量')-s0===3,'swordsmanship 60 grants +3 strength via training');
// 进阶解锁：双基础资深 + 技能75 + 属性13
mc.jobsRank[5]=3;mc.jobsRank[4]=3;mc.skills['剑术']=75;mc.attributes['力量']=13;mc.job=5;mc.rank=3;mc=perform(mc,'work').state;check(mc.jobsRank[8]>0,'paladin unlocked when knight+healer senior with skill and attr');
check(perform(mc,'job','8').state.job===8,'can switch to unlocked advanced job');
// 门槛确实高：技能不足不解锁
let lowSkill=createGame(d);lowSkill.cash=100000;lowSkill.job=5;lowSkill.jobsRank[5]=3;lowSkill.jobsRank[4]=3;lowSkill.skills['剑术']=50;lowSkill.attributes['力量']=13;lowSkill=perform(lowSkill,'work').state;check(lowSkill.jobsRank[8]===0,'paladin stays locked without skill 75');
// 转职继承：进阶职业继承前置基础职业的全部属性加成
const inh=createGame(d);inh.job=8;inh.jobsRank[8]=0;check(attr(inh,'力量')===16&&attr(inh,'智力')===12,'paladin inherits knight strength + healer intelligence');
const inh2=createGame(d);inh2.job=8;inh2.jobsRank[8]=10;check(Math.round(attr(inh2,'力量')*10)/10===17,'paladin own level growth stacks on inherited attr');
// 传奇者继承全部进阶职业属性加成 + 转职时各进阶实际等级（封顶50）的等级成长
const leg=createGame(d);leg.job=16;leg.jobsRank[16]=50;for(let q=8;q<=15;q++)leg.jobsRank[q]=50;check(Math.round(attr(leg,'力量')*10)/10===65,'legend inherits all advanced attrs + own level growth, then x1.3 attrPct');
const legA=createGame(d);legA.job=16;legA.jobsRank[16]=0;check(Math.round(attr(legA,'智力')*10)/10===33.8,'legend inherits all advanced job base attrs (x1.3)');
const legHalf=createGame(d);legHalf.job=16;legHalf.jobsRank[16]=0;legHalf.jobsRank[9]=30;check(Math.round(attr(legHalf,'智力')*10)/10===37.7,'legend inherits advanced actual level growth (x1.3)');
// 经验机制：修炼积累经验，经验满升级
const ex=createGame(d);ex.job=8;ex.jobsRank[8]=0;ex.jobExp[8]=0;const need0=expNeed(ex,8);const gain0=expGain(ex);ex.jobExp[8]=need0-1;const exr=perform(ex,'promote');check(!exr.error&&exr.state.jobsRank[8]===1,'practice gains exp and levels up when full');check(exr.state.jobExp[8]<expNeed(exr.state,8),'exp overflows correctly after level up');
const exNoUp=createGame(d);exNoUp.job=8;exNoUp.jobsRank[8]=0;exNoUp.jobExp[8]=0;const exr2=perform(exNoUp,'promote');check(exr2.state.jobsRank[8]===0&&exr2.state.jobExp[8]===gain0,'practice below threshold only accumulates exp');
// 传奇者升级经验需求最多（各等级段均高于进阶职业）
const lg=createGame(d);lg.job=16;lg.jobsRank[16]=50;const mg=createGame(d);mg.job=9;mg.jobsRank[9]=50;check(expNeed(lg,16)>expNeed(mg,9),'legend needs most exp');
// 传奇者每级成长=8个进阶职业成长总和
const sum={力量:.27,敏捷:.07,体质:.10,智力:.37,感知:.28,意志:.12,魅力:.20};check(Object.entries(jobs[16].attrStep).every(([k,v])=>Math.abs(v-sum[k])<1e-9),'legend attrStep equals sum of all advanced job steps');
// 职业技能系统：专属技能仅当前职业可练；通用技能人人可练
const lim=createGame(d);lim.job=0;check(!perform(lim,'train','锻造').error,'all skills trainable by any job');check(!perform(lim,'train','耕种').error,'all skills trainable by any job (craft)');check(!perform(lim,'train','生存').error,'generic skill trainable by all');check(!perform(lim,'train','剑术').error,'martial skills are trainable by all');
// 传奇者特性：全属性+30%
const legP=createGame(d);legP.job=16;legP.jobsRank[16]=0;check(Math.round(attr(legP,'力量')*10)/10===29.9,'legend attrPct grants +30% to all attrs');check(Math.round(attr(legP,'智力')*10)/10===33.8,'legend attrPct applies to int too');
// 骑术：缩短旅行用时
const ride1=createGame(d);ride1.job=5;ride1.skills.骑术=80;const rideR1=perform(ride1,'travel','2').state;const ride2=createGame(d);ride2.job=5;ride2.skills.骑术=0;const rideR2=perform(ride2,'travel','2').state;check(rideR1.day-ride1.day===7&&rideR2.day-ride2.day===9,'riding shortens travel time');
// 贸易：购物折扣
const tb=createGame(d);tb.job=2;tb.skills.贸易=200;const tb0=createGame(d);tb0.job=2;tb0.skills.贸易=0;const bp=perform(tb,'buy','黑面包').state;const bp0=perform(tb0,'buy','黑面包').state;check(tb.cash-bp.cash<tb0.cash-bp0.cash,'trade skill discounts purchases');
// 绝技系统：每职业10个招式、每10级解锁、威力=基础x属性百分比
check(jobs.slice(0,8).every(j=>j.moves?.length===4)&&jobs.slice(8).every(j=>j.moves?.length===10),'base jobs have 4 moves, advanced 10');
const palM=createGame(d);palM.job=8;palM.jobsRank[8]=10;check(moveUnlocked(palM,8,0)&&!moveUnlocked(palM,8,1),'moves unlock every 10 levels');const kniM=createGame(d);kniM.job=5;kniM.jobsRank[5]=2;check(moveUnlocked(kniM,5,0)&&moveUnlocked(kniM,5,1)&&!moveUnlocked(kniM,5,2),'base jobs unlock one move per rank');
const palW=createGame(d);palW.job=8;palW.jobsRank[8]=10;palW.attributes={...palW.attributes,力量:50,智力:40};const pw=movePower(palW,8,0);const pe=Math.round(60*(1+attr(palW,'力量')*1.2/100+attr(palW,'智力')*.6/100));check(pw===pe,'move power = base x attr scaling');
// 传奇者：等级解锁全职业绝技；自己招式享受全属性加成
const legM=createGame(d);legM.job=16;legM.jobsRank[16]=70;check(moveUnlocked(legM,0,6)&&!moveUnlocked(legM,0,7),'legend can use other job moves up to his level');check(attrNames.every(a=>jobs[16].moves[0][3][a]>0),'legend moves scale with all attrs');check(movePower(legM,16,0)>movePower(palW,8,0),'legend move outpowers normal job moves');
// 绝技消耗：物理系耗体力、法术系耗法力、魔武系双耗
const mageC=moveCost(7,60);check(mageC.mana>0&&!mageC.stamina,'mage moves cost mana');const kniC=moveCost(5,60);check(kniC.stamina>0&&!kniC.mana,'knight moves cost stamina');const palC=moveCost(8,60);check(palC.stamina>0&&palC.mana>0,'paladin moves cost both');const costRise=moveCost(5,120).stamina>moveCost(5,60).stamina;check(costRise,'move cost rises with power');
// 四维上限由属性实时推导：体质→生命、体质+力量→体力、意志+魅力→精神、智力/感知→魔力
const h1=createGame(d);h1.attributes.体质=20;check(maxHp(h1)===Math.round(100+(attr(h1,'体质')-10)*6),'max hp scales with physique');h1.attributes.力量=25;check(maxStamina(h1)===Math.round(100+(attr(h1,'体质')-10)*3+(attr(h1,'力量')-10)*1.5),'max stamina scales with physique+strength');h1.attributes.意志=18;check(maxSpirit(h1)===Math.round(100+(attr(h1,'意志')-10)*3+(attr(h1,'魅力')-10)),'max spirit scales with willpower');const mm1=createGame(d);mm1.attributes.智力=30;check(effectiveMaxMana(mm1)>=Math.round((mm1.maxMana||0)+(attr(mm1,'智力')-10)),'max mana scales with intelligence');
// 切换职业属性变动→上限实时变化；休息恢复到动态上限
const j1=createGame(d);j1.job=5;check(maxHp(j1)===Math.round(100+(attr(j1,'体质')-10)*6),'vitals always derived from attrs');const rv1=createGame(d);rv1.attributes.体质=30;rv1.stamina=0;const rv2=perform(rv1,'rest').state;check(rv2.stamina===Math.min(maxStamina(rv2),60),'rest recovers up to dynamic cap');
// 进阶职业等级系统：1—100级，修炼积累经验升级
let gm=createGame(d);gm.cash=100000;gm.job=8;gm.jobsRank[8]=3;gm.jobExp[8]=0;gm.skills['剑术']=120;gm=perform(gm,'promote').state;check(gm.jobsRank[8]===4&&gm.jobExp[8]<expNeed(gm,8),'advanced job cultivation gains exp and levels up when full');check(jobTitle(gm).includes('4级'),'advanced job title shows level');
check(validSave(gm),'advanced level save validates');
let lowLv=createGame(d);lowLv.cash=100000;lowLv.job=8;lowLv.jobsRank[8]=10;lowLv.jobExp[8]=0;lowLv.skills['剑术']=12;lowLv=perform(lowLv,'promote').state;check(lowLv.jobsRank[8]===10&&lowLv.jobExp[8]===expGain(lowLv),'cultivation gains exp regardless of skill (skill speeds it up)');
// 等级属性成长：每级按职业 attrStep 加成
const lvA=createGame(d);lvA.job=9;lvA.jobsRank[9]=10;const lvA0=attr(lvA,'智力');lvA.jobsRank[9]=60;check(Math.round((attr(lvA,'智力')-lvA0)*10)/10===5,'magic swordsman level 10->60 grants +5 intelligence (0.1/level)');
// 等级日薪：每级 payStep 提升
const pay1=createGame(d);pay1.cash=100000;pay1.job=9;pay1.jobsRank[9]=10;pay1.skills['元素']=80;const r1=perform(pay1,'work').state;const pay2=createGame(d);pay2.cash=100000;pay2.job=9;pay2.jobsRank[9]=60;pay2.skills['元素']=80;const r2=perform(pay2,'work').state;check(r2.cash>r1.cash+300,'level 60 magic swordsman earns more than level 10 (payStep)');
// 职业特性：骑士工作收入加成生效
const kw=createGame(d);kw.cash=100000;kw.job=5;kw.jobsRank[5]=1;kw.skills['剑术']=20;const gw=createGame(d);gw.cash=100000;gw.job=0;gw.jobsRank[0]=1;gw.skills['生存']=20;const kr=perform(kw,'work').state;const gr=perform(gw,'work').state;check(kr.day===7&&gr.day===7&&kr.cash>gr.cash,'knight work income exceeds farmer due to passive');
// 终极解锁：全部进阶职业达到50级
let ul=createGame(d);ul.cash=1000000;for(let q=8;q<=15;q++)ul.jobsRank[q]=50;ul=perform(ul,'job','1').state;check(ul.jobsRank[16]>0,'legend unlocked when all advanced jobs reach level 50');
let ulLow=createGame(d);ulLow.cash=1000000;for(let q=8;q<=15;q++)ulLow.jobsRank[q]=49;ulLow=perform(ulLow,'job','1').state;check(ulLow.jobsRank[16]===0,'legend stays locked at advanced level 49');
const old=createGame(d);delete old.jobsRank;const norm=normalizeSave(old);check(norm.jobsRank.length===jobs.length&&norm.jobsRank[norm.job]===old.rank,'normalizeSave migrates legacy save');
// 旧档进阶职业阶位迁移：1见习->10级、2正式->30级、3资深->60级、4宗师->100级
const oldAdv=createGame(d);oldAdv.jobsRank[8]=1;oldAdv.jobsRank[9]=4;const normAdv=normalizeSave(oldAdv);check(normAdv.jobsRank[8]===10&&normAdv.jobsRank[9]===100,'advanced rank migrated to levels');
check(validSave(old),'legacy save without jobsRank still valid');
check(validSave(mc)&&validSave(ul),'multi-job saves validate');
// 产业系统：多产业 + 选址 + 自动维护
let es=createGame(d);es.cash=1000000;es.jobsRank[es.job]=1;es.skills['锻造']=25;es.skills['贸易']=25;
es=perform(es,'estate','loen-1|工匠巷|工坊').state;check(es.estates.length===1,'open first business');
es.cash=1000000;es=perform(es,'estate','alma-0|水手街|商铺').state;check(es.estates.length===2,'open second business in another city');
const be=es.estates[0];check(be.cityId==='loen-1'&&be.streetId==='工匠巷'&&be.type==='工坊','business location recorded');
es.cash=10;check(!!perform(es,'estate','loen-1|工匠巷|工坊').error,'cannot open without funds');es.cash=1000000;
es.estates[0].condition=69;es=perform(es,'year').state;check(es.estates[0].condition===100,'auto maintenance restores condition');check(es.log.at(-1)?.changes.some(c=>c.includes('自动维护')),'auto maintenance logged');
const old2=createGame(d);old2.estate={name:'铁匠小工坊',level:2,condition:80,workers:1,revenue:50};delete old2.estates;const n2=normalizeSave(old2);check(n2.estates.length===1&&n2.estates[0].level===2&&n2.estates[0].name==='铁匠小工坊','normalizeSave migrates legacy estate');check(typeof n2.estates[0].cityId==='string'&&n2.estates[0].cityId.length>0,'legacy estate gets home city');
check(validSave(old2),'legacy single-estate save still valid');
check(validSave(es),'multi-estate save validates');
// 封地系统：受封条件 + 经营 + 升级 + 官员
let ff=createGame(d);ff.cash=1000000;ff.fame[ff.region]=30;check(!!perform(ff,'fief').error,'fief requires fame');
ff.fame[ff.region]=50;ff.jobsRank[0]=2;ff=perform(ff,'fief').state;check(!!ff.fief&&ff.fief.level===1&&ff.fief.pop>=100,'granted fief as village');
check(ff.fief.name.length>0&&ff.fief.cityId.length>0,'fief has name and home city');
check(!!perform(ff,'fief-expand').error,'fief upgrade requires population');
ff.cash=100000000;
for(const bd of ['农田','道路','市集','兵营','学堂','粮仓']){let k=0;while((ff.fief.buildings?.[bd]||0)<3){ff=perform(ff,'fief-build',bd).state;k++;if(k>6)break}}
ff.fief.pop=300;ff.fief.loyalty=60;ff.fame[ff.region]=60;ff.cash=1000000;ff=perform(ff,'fief-expand').state;check(ff.fief.level===2&&ff.fief.pop>=500,'fief upgraded to town');
check(ff.fief.buildings&&Object.values(ff.fief.buildings).every(v=>v===0),'fief buildings reset after upgrade');
const nn=ff.npcs[0];nn.trust=40;ff.cash=1000000;ff=perform(ff,'fief-officer',nn.id+'|税务官').state;check(ff.fief.officers.length===1&&ff.fief.officers[0].role==='税务官','fief officer appointed');
ff=perform(ff,'year').state;check(Number.isFinite(ff.fief.tax),'fief monthly settlement');check(validSave(ff),'fief save validates');
console.log(`Passed ${checked} gameplay and persistence checks.`);

const {pushHistory,popHistory,upsertSlot}=await importTS('lib/save-state.ts');
let history=[];let current=createGame(d);const start=JSON.stringify(current);history=pushHistory(history,current);current=perform(current,'work').state;const restored=popHistory(history);check(JSON.stringify(restored.game)===start,'undo restores complete prior state');check(restored.history.length===0,'undo consumes one history entry');check(popHistory([])===null,'empty undo intentional');
let slots=upsertSlot([],'a',current,history,'today');slots[0].label='原路线';const slotB=structuredClone(current);slotB.cash+=300;slots=upsertSlot(slots,'b',slotB,[],'today');const snapshot=JSON.stringify(slots[0]);slots=upsertSlot(slots,'b',perform(slotB,'rest').state,[],'tomorrow');check(JSON.stringify(slots.find(s=>s.id==='a'))===snapshot,'editing second slot preserves first');check(slots.length===2,'upsert does not duplicate slots');slots=upsertSlot(slots,'a',current,history,'later');check(slots.find(s=>s.id==='a').label==='原路线','autosave preserves custom name');
for(let i=0;i<25;i++)history=pushHistory(history,current);check(history.length===20,'history bounded to 20');const loaded=JSON.parse(JSON.stringify(slots));check(loaded.every(s=>validSave(s.game)&&s.history.every(validSave)),'slot JSON validates');console.log(`Passed ${checked} total checks, including independent slots and full-state undo.`);
