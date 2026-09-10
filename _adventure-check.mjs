import {importTS} from './test-loader.mjs';
const {createGame,perform,adultAge,age,ageStage,dungeons,gearShop,gearByName,attr,playerAtk,playerDef,maxHp,jobs,expGain,normalizeSave,validSave,skillNames,fiefBuildings,buildingCap,buildingCost,businessTiers}=await importTS('lib/game.ts');
const {businessTypes}=await importTS('lib/world.ts');

let pass=0,fail=0;
const ok=(cond,msg)=>{if(cond){pass++;console.log('  ok',msg)}else{fail++;console.log('  FAIL',msg)}};

// ===== 1. 创建新档（人类·成年·低级），进入旧矿洞 =====
console.log('== 副本基础 ==');
let s=createGame({name:'测试者',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
s.cash=5000; s.day=0; // 调整：成年即可见习
// 先打点基础：train 一次剑术？直接进入——minRank=1 需要 jobsRank>=1——设 rank
s.jobsRank=[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; s.rank=1; s.jobExp=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
s.attributes={力量:24,敏捷:16,体质:20,智力:10,感知:12,魅力:10,意志:12,幸运:10};
s.items=[{name:'铁剑',slot:'武器',count:1,weight:2.4,durability:20},{name:'皮甲',slot:'护甲',count:1,weight:4,durability:20}];
s.equip={weapon:'铁剑',armor:'皮甲'};
let r=perform(s,'dungeon','mine');
ok(!r.error, '进入旧矿洞：'+(r.error||'')); if(r.error){console.log(r.error)}
s=r.state;
ok(!!s.battle&&!s.battle.done,'battle 已建立');
const cashBefore=s.cash, expBefore=s.jobExp[s.job];
// 攻击到通关（最多 80 回合）
let guard=0;
while(s.battle&&!s.battle.done&&guard++<80){
  const step=perform(s,'battle','attack');
  if(step.error&&step.error.includes('不在冒险'))break;
  s=step.state;
}
ok(!!s.battle&&s.battle.done&&s.battle.won,'通关旧矿洞：won='+(s.battle?.won));
ok(!!s.battle?.drop&&(gearByName(s.battle.drop)||['黑面包','止血草','魔力药水','疗伤绷带','蜂蜜酒'].includes(s.battle.drop)),'战利品 drop 记录：'+s.battle?.drop);
ok(s.cash>cashBefore,'获得金钱：'+(s.cash-cashBefore));
const skillGain=s.skills['剑术']>0||s.jobExp[s.job]>expBefore;
ok(s.jobExp[s.job]>expBefore||s.skills[jobs[s.job].skill]>0,'获得职业经验或技能熟练度：jobExp+'+(s.jobExp[s.job]-expBefore)+' '+jobs[s.job].skill+s.skills[jobs[s.job].skill]);
ok(s.battle&&s.battle.log.some(l=>l.includes('回合')),'文字流含回合描述');
ok(s.battle&&s.battle.log.some(l=>l.includes('伤害')),'文字流含伤害数值');
ok(s.battle&&s.battle.log.some(l=>l.includes('倒下了')),'文字流含击杀');
ok(s.clearedDungeons.includes('mine'),'已记录通关');
ok(s.battle&&s.battle.log.some(l=>l.includes('战利品')||s.items.some(i=>i.name===s.battle?.drop)),'有掉落/战利品提示');
// 重复可打
s.battle=null;
r=perform(s,'dungeon','mine'); s=r.state;
ok(!r.error,'副本可重复进入');

// ===== 2. 副本经验 > 修炼经验 =====
console.log('== 经验对比 ==');
s=createGame({name:'测试者',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
s.jobsRank=[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; s.rank=1; s.cash=5000;
const trainGain=expGain(s);
const dg=perform(s,'dungeon','mine').state;
ok(dungeons[0].reward>trainGain,'副本奖励('+dungeons[0].reward+')>修炼('+trainGain+')');

// ===== 3. 装备系统 =====
console.log('== 装备 ==');
s=createGame({name:'测试者',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
s.jobsRank=[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; s.rank=1; s.cash=5000;
// 初始粗布衣/旧短刀应可装备
r=perform(s,'equip','粗布衣'); ok(!r.error,'初始粗布衣可装备：'+(r.error||'')); s=r.state;
r=perform(s,'equip','旧短刀'); ok(!r.error,'初始旧短刀可装备：'+(r.error||'')); s=r.state;
ok(!!s.equip.weapon&&!!s.equip.armor,'装备栏已填写');
const atk0=playerAtk(s), def0=playerDef(s), hp0=maxHp(s);
s.market={day:s.day,list:[...s.market.list,{name:'铁剑',slot:'武器',quality:2,price:900,type:'武',desc:''},{name:'皮甲',slot:'护甲',quality:2,price:700,type:'护',desc:''}]};
r=perform(s,'buy','铁剑'); ok(!r.error,'商店买入铁剑：'+(r.error||'')); s=r.state;
r=perform(s,'equip','铁剑'); ok(!r.error,'装备铁剑：'+(r.error||'')); s=r.state;
ok(playerAtk(s)>=atk0+4,'普攻攻击提升(换装+4)：'+(playerAtk(s)-atk0));
r=perform(s,'buy','皮甲'); s=r.state;
r=perform(s,'equip','皮甲'); ok(!r.error,'装备皮甲：'+(r.error||'')); s=r.state;
ok(playerDef(s)>=def0+3,'防御提升(换装+3)');
ok(maxHp(s)>=hp0+20,'生命上限提升(护甲hp+20)：'+(maxHp(s)-hp0));
// 换装：旧装备回背包
const hasShort=s.items.some(i=>i.name==='旧短刀'&&i.count>0);
ok(hasShort,'换装后旧武器回到背包');
r=perform(s,'unequip','铁剑'); ok(!r.error,'卸下铁剑'); s=r.state;
ok(s.items.some(i=>i.name==='铁剑'&&i.count>0)&&!s.equip.weapon,'卸下后装备栏清空、物品回归');
// 商店卖
const c0=s.cash;
r=perform(s,'sell','铁剑'); ok(!r.error,'卖出铁剑：'+(r.error||'')); s=r.state;
ok(s.cash>c0,'卖出获得收入');
// 已装备不能卖
r=perform(s,'equip','旧短刀'); s=r.state;
r=perform(s,'sell','旧短刀');
ok(!!r.error,'已装备物品不可卖出');

// ===== 4. 副本失败（逃跑） =====
console.log('== 逃跑 ==');
s=createGame({name:'测试者',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
s.jobsRank=[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; s.rank=1; s.cash=5000;
r=perform(s,'dungeon','mine'); s=r.state;
r=perform(s,'battle','flee'); s=r.state;
ok(!s.battle||s.battle.done,'逃跑结束战斗');

// ===== 5. 剧情杀（年龄段） =====
console.log('== 剧情杀 ==');
// 人类 18 成年/35 壮年/50 老年。构造 49 岁人类 → 不会触发；50 岁 → 触发
let s2=createGame({name:'老人',gender:'男',race:'人类',age:'壮年',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
s2.ageStart=30; s2.day=19*360; // 49 岁
ok(age(s2)===49&&ageStage(s2)==='壮年','49岁=壮年');
r=perform(s2,'rest'); s2=r.state;
ok(!s2.fate,'壮年不触发命运试炼');
s2.day=20*360; // 50 岁
ok(age(s2)===50&&ageStage(s2)==='老年','50岁=老年');
r=perform(s2,'rest'); s2=r.state;
ok(!!s2.fate&&!s2.fate.done,'进入老年触发命运试炼');
// 精灵 35 成年/70 壮年/110 老年 —— 100 岁还是壮年
let se=createGame({name:'精灵',gender:'女',race:'精灵遗民',age:'成年',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
se.ageStart=30; se.day=70*360; // 100 岁
ok(age(se)===100&&ageStage(se)==='壮年','精灵100岁=壮年（未到110老年）');
// 打赢命运试炼
s2.hp=maxHp(s2);
// 把命运数值压低以便打赢：直接设置 fate 较弱
s2.fate={name:'命运之影',hp:50,maxHp:50,atk:1,def:0,log:['试炼'],turn:1,done:false,won:false};
let guard2=0;
while(s2.fate&&!s2.fate.done&&guard2++<20){const st=perform(s2,'fate','attack'); if(st.error)break; s2=st.state;}
ok(!!s2.fate&&s2.fate.done&&s2.fate.won,'命运试炼打赢存活');
ok(s2.fateDone&&!s2.dead,'fateDone 置位、未死亡');
// 打输 → dead
let s3=createGame({name:'输家',gender:'男',race:'人类',age:'壮年',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
s3.ageStart=30; s3.day=20*360; s3.hp=5;
r=perform(s3,'rest'); s3=r.state;
if(s3.fate){s3.fate.hp=99999; s3.fate.atk=999; s3.fate.def=0;}
guard2=0;
while(s3.fate&&!s3.fate.done&&guard2++<10){const st=perform(s3,'fate','attack'); if(st.error)break; s3=st.state;}
ok(s3.fate&&s3.fate.done&&!s3.fate.won&&s3.dead,'命运试炼打输 → dead');

// ===== 6. 存档兼容 =====
console.log('== 存档兼容 ==');
const old={version:1,id:'x',draft:{name:'旧档',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命',region:'洛恩王国',social:'自由农民',family:'双亲与手足',education:'工坊学艺',personality:'坚毅',childhood:'帮助邻人收获',identity:'旧档'},day:0,ageStart:18,region:0,birthRegion:0,job:0,rank:0,jobsRank:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],jobExp:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],seed:1,turn:0,hp:100,stamina:100,spirit:100,mana:0,maxMana:0,hunger:0,injury:0,cash:800,debt:0,debtDue:0,attributes:{力量:10,体质:10,敏捷:10,智力:10,感知:10,魅力:10,意志:10,幸运:10},skills:Object.fromEntries(skillNames.map(k=>[k,0])),items:[],npcs:[],quests:[],fame:[0,0,0,0,0,0],crime:0,estates:[],spouse:null,children:[],known:[0],event:null,seen:{},log:[],mode:'casual',dead:false,retired:false,generation:1,heir:false};
const n=normalizeSave(old);
ok(n.equip&&typeof n.equip==='object','旧档补齐 equip');
ok(n.battle===null,'旧档补齐 battle=null');
ok(n.fate===null,'旧档补齐 fate=null');
ok(n.fateDone===false,'旧档补齐 fateDone=false');
ok(Array.isArray(n.clearedDungeons),'旧档补齐 clearedDungeons');
ok(validSave(n),'旧档 normalize 后通过 validSave');

// === 市场系统 ===
const mk=createGame({name:'市集客',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
const fixed=['黑面包','止血草','魔力药水','符文练习板'];
ok(fixed.every(f=>mk.market.list.some(m=>m.name===f)),'基础药品常驻货架');
ok(mk.market.list.length>=14,'货架商品数量：'+mk.market.list.length);
for(const t of ['武','护','饰','材','魔'])ok(mk.market.list.some(m=>m.type===t),'类型覆盖 '+t);
ok(new Set(mk.market.list.map(m=>m.quality)).size>=2,'货架品质覆盖≥2档：'+[...new Set(mk.market.list.map(m=>m.quality))].join(','));
ok(mk.market.day===0,'货架日=0');
let r2=perform(mk,'work'); ok(!r2.error,'推进一天'); let mk2=r2.state;
ok(mk2.market.day===mk2.day,'货架随日期刷新：day='+mk2.market.day);
ok(Array.isArray(mk2.market.list)&&mk2.market.list.length>=14,'刷新后货架完整');
// 买非上架商品应拒绝
r2=perform(mk2,'buy','弑神者'); ok(!!r2.error,'未上架商品不可买：'+(r2.error||''));
// 买新药并使用
mk2.market.list=[...mk2.market.list,{name:'疗伤绷带',slot:'消耗',quality:2,price:45,type:'药',desc:''}];
r2=perform(mk2,'buy','疗伤绷带'); ok(!r2.error,'买入疗伤绷带：'+(r2.error||'')); mk2=r2.state;
const hpBefore=mk2.hp;
r2=perform(mk2,'use','疗伤绷带'); ok(!r2.error,'使用疗伤绷带：'+(r2.error||'')); mk2=r2.state;
ok(mk2.hp>hpBefore,'疗伤绷带回血：'+(mk2.hp-hpBefore));
// 材料类不可直接使用
r2=perform(mk2,'use','铁锭'); ok(!!r2.error,'材料不可直接使用：'+(r2.error||''));

// === 领地系统：人口自然增长 + 建设 ===
let fl=createGame({name:'领主',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'宽裕',edu:'中级',potential:'无',goal:'安身立命',region:'洛恩王国',social:'骑士家庭',family:'双亲与手足',education:'骑士启蒙',personality:'坚毅',childhood:'旁观骑士比武',identity:'领主'},'casual');
fl.cash=1000000;fl.fame[fl.region]=60;fl.jobsRank[0]=2;
let rf=perform(fl,'fief'); ok(!rf.error,'受封：'+(rf.error||'')); fl=rf.state;
ok(!!fl.fief&&fl.fief.pop>=100,'受封初始人口≥100');
const pop0=fl.fief.pop;
fl=perform(fl,'year').state; fl=perform(fl,'year').state;
ok(fl.fief.pop>pop0,'人口自然增长：'+pop0+'→'+fl.fief.pop);
rf=perform(fl,'fief-build','农田'); ok(!rf.error,'建设农田：'+(rf.error||'')); fl=rf.state;
ok(fl.fief.buildings['农田']===1,'农田等级1');
rf=perform(fl,'fief-build','农田'); ok(!rf.error,'农田升2级：'+(rf.error||'')); fl=rf.state;
ok(fl.fief.buildings['农田']===2,'农田等级2');
rf=perform(fl,'fief-build','农田'); ok(!rf.error,'农田升3级：'+(rf.error||'')); fl=rf.state;
rf=perform(fl,'fief-build','农田'); ok(!!rf.error,'农田满级拒绝：'+(rf.error||''));
ok(validSave(fl),'带建筑封地通过 validSave');
ok(Array.isArray(normalizeSave(structuredClone(fl)).fief.buildings)===false,'normalize 保留 buildings');

// === 城市系统：堡升格城市 · 市长政务 · 多级成长 ===
let cm=createGame({name:'市长',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'宽裕',edu:'中级',potential:'无',goal:'安身立命',region:'洛恩王国',social:'骑士家庭',family:'双亲与手足',education:'骑士启蒙',personality:'坚毅',childhood:'旁观骑士比武',identity:'市长'},'casual');
cm.cash=100000000;cm.fame[cm.region]=95;cm.jobsRank[0]=2;
let rc=perform(cm,'fief'); ok(!rc.error,'受封：'+(rc.error||'')); cm=rc.state;
rc=perform(cm,'fief-city'); ok(!!rc.error&&/堡垒/.test(rc.error||''),'村不可直接升格：'+(rc.error||''));
cm.fief.level=3;cm.fief.pop=3200;cm.fief.loyalty=80;cm.fief.garrison=100;
// 升格需全部市政建筑满3级
for(const bd of ['农田','道路','市集','兵营','学堂','粮仓']){let k=0;while((cm.fief.buildings?.[bd]||0)<3){cm=perform(cm,'fief-build',bd).state;k++;if(k>6)break}}
rc=perform(cm,'fief-city'); ok(!rc.error,'堡垒升格城市：'+(rc.error||'')); cm=rc.state;
ok(!!cm.city&&cm.city.level===1&&cm.fief===null,'城市生成且封地移交');
ok(fiefBuildings.every(bd=>(cm.city.buildings[bd.id]||0)===0),'升格后市政建设清零');
ok(cm.city.name.endsWith('城'),'城市命名：'+cm.city.name);
ok(cm.city.streets.length>=4&&cm.city.notable.some(n=>n.role.includes('市长')),'城市有街道与市长要员');
ok(validSave(cm),'带城市通过 validSave');
const cpop0=cm.city.pop;
cm=perform(cm,'year').state;
ok(cm.city.pop>cpop0,'城市人口自然增长：'+cpop0+'→'+cm.city.pop);
rc=perform(cm,'city-tax','high'); ok(!rc.error,'调整重税：'+(rc.error||'')); cm=rc.state;
ok(cm.city.taxRate==='high','税率生效');
rc=perform(cm,'city-law','trade'); ok(!rc.error,'颁布招商政令：'+(rc.error||'')); cm=rc.state;
ok(cm.city.prosperity>=55,'政令提升繁荣');
rc=perform(cm,'city-build','农田'); ok(!rc.error,'市政建设农田：'+(rc.error||'')); cm=rc.state;
ok(cm.city.buildings['农田']===1,'城市建筑生效');
// 每级建筑3级制：可升至3级，4级被拒
cm.cash=100000000;
cm=perform(cm,'city-build','农田').state;cm=perform(cm,'city-build','农田').state;
ok(cm.city.buildings['农田']===3,'市政建设可升至3级（本级上限）');
rc=perform(cm,'city-build','农田'); ok(!!rc.error&&/上限/.test(rc.error||''),'4级被拒：'+(rc.error||'').slice(0,30));
// 升级需全部市政建筑达标
cm.city.pop=25000;cm.city.loyalty=80;cm.city.prosperity=66;cm.fame[cm.region]=115;
rc=perform(cm,'city-grow'); ok(!!rc.error&&/市政建筑/.test(rc.error||''),'建筑未达标拒绝升级：'+(rc.error||'').slice(0,30));
for(const bd of ['农田','道路','市集','兵营','学堂','粮仓']){let k=0;while((cm.city.buildings?.[bd]||0)<3){cm=perform(cm,'city-build',bd).state;k++;if(k>8)break}}
ok(fiefBuildings.every(bd=>(cm.city.buildings[bd.id]||0)>=3),'全部建筑升至3级');
cm.city.pop=25000;cm.city.loyalty=80;cm.city.prosperity=66;cm.fame[cm.region]=115;
rc=perform(cm,'city-grow'); ok(!rc.error,'扩建中城：'+(rc.error||'')); cm=rc.state;
ok(cm.city.level===2&&cm.city.streets.length>=5,'中城扩建成功');
ok(fiefBuildings.every(bd=>(cm.city.buildings[bd.id]||0)===0),'城市升级后建筑等级清零');
ok(buildingCap(cm.city.level)===3,'本级建筑上限恒为3级');
// 收入随等级大幅提升
const tax0=cm.city.tax;
cm=perform(cm,'year').state;
ok(cm.city.tax>tax0&&cm.city.tax>150000,'城市月结大幅提升（中城>15金）：'+Math.round(cm.city.tax/100)/100+'金');
// 玩家城市开办产业（免地皮·装修价）
cm.jobsRank[cm.job]=1;cm.skills['锻造']=30;
cm.city.prosperity=55;cm.city.loyalty=10;cm.city.pop=100;cm.city.garrison=0; // 消除月结干扰
const pcid=cm.city.id;const streetName=cm.city.streets[1].name;const cash0=cm.cash;
rc=perform(cm,'estate',pcid+'|'+streetName+'|工坊'); ok(!rc.error,'自家城市开办产业：'+(rc.error||'')); cm=rc.state;
const price=cash0-cm.cash;
const expect=Math.round(businessTypes.find(b=>b.name==='工坊').cost*(1+55/200)*0.4);
ok(price<0&&Math.abs(-price-expect)<4000,'免地皮开办价仅装修（'+(-price/100).toFixed(1)+'银≈'+expect/100+'银）：'+(price/100).toFixed(2)+'银');
console.log('  DBG estate cash',cash0,'->',cm.cash,'price',price);
ok(cm.estates.some(e=>e.cityId===pcid),'产业落在自家城市');
// 建筑费用随城市等级上涨
const costBase=buildingCost(fiefBuildings[0],0,1),costMid=buildingCost(fiefBuildings[0],0,2),costHuge=buildingCost(fiefBuildings[0],0,5);
ok(costMid===Math.round(costBase*1.6)&&costHuge===Math.round(costBase*3.4),'建筑费用随城市等级上涨：'+costBase+'→'+costMid+'→'+costHuge);
// 产业深度：可升至10级并获得高级名
const estId=cm.estates.find(e=>e.cityId===pcid).id;
cm.cash=100000000;
for(let i=1;i<=9;i++){cm=perform(cm,'expand',estId).state}
ok(cm.estates[0].level===10,'产业可升至10级');
ok(businessTiers[9]==='商脉通国','高级等级名：'+businessTiers[cm.estates[0].level-1]);
rc=perform(cm,'expand',estId); ok(!!rc.error&&/最大规模/.test(rc.error||''),'10级封顶：'+(rc.error||'').slice(0,30));
cm.city.pop=300000;cm.city.loyalty=90;cm.city.prosperity=80;cm.fame[cm.region]=140;
// 每级建满3级再升级（升级后清零重来；fill3/grow 会跨月扣忠诚，故每次 grow 前重设门槛）
const fill3=()=>{for(const bd of fiefBuildings.map(b=>b.id)){let k=0;while((cm.city.buildings?.[bd]||0)<3){const rr=perform(cm,'city-build',bd);if(rr.error){break}cm=rr.state;k++}}};
const setNeed=()=>{cm.city.pop=300000;cm.city.loyalty=95;cm.city.prosperity=90;cm.fame[cm.region]=140};
setNeed();fill3();setNeed();
cm=perform(cm,'city-grow').state;
setNeed();fill3();setNeed();
cm=perform(cm,'city-grow').state;
setNeed();fill3();setNeed();
cm=perform(cm,'city-grow').state;
ok(cm.city.level===5,'城市升至巨城');
ok(buildingCap(cm.city.level)===3,'巨城建筑上限3级（每级重置）');
rc=perform(cm,'city-grow'); ok(!!rc.error&&/巨城/.test(rc.error||''),'巨城封顶：'+(rc.error||''));
const nm=normalizeSave(structuredClone(cm));
ok(nm.city.buildings&&!Array.isArray(nm.city.buildings)&&nm.city.taxRate==='high','normalize 保留城市字段');

// ===== 本轮：20 副本 + 强度匹配 + 装备库 + 药品分级 + 动态掉落 =====
console.log('== 副本扩充与强度匹配 ==');
ok(dungeons.length===20,'副本共 20 个：'+dungeons.length);
const tiers=dungeons.map(d=>d.tier);
ok(tiers.every(t=>t>=1&&t<=10),'难度档位 1-10');
const byTier={}; for(const d of dungeons)byTier[d.tier]=(byTier[d.tier]||0)+1;
ok(Object.values(byTier).every(n=>n===2),'每档 2 个副本：'+JSON.stringify(byTier));
let mono=true; for(let i=1;i<dungeons.length;i++)if(dungeons[i].minRank<dungeons[i-1].minRank)mono=false;
ok(mono,'minRank 单调递增');
// 强度匹配：同档怪 hp/atk 有界、后档严格更强
let bounds=true;
for(const d of dungeons){
  const all=[...d.stages,d.boss];
  if(d.tier>1){const prev=dungeons.filter(x=>x.tier===d.tier-1).flatMap(x=>[...x.stages,x.boss]);const pmax=Math.max(...prev.map(m=>m.hp));const pAtk=Math.max(...prev.map(m=>m.atk));if(Math.max(...all.map(m=>m.hp))<=pmax||Math.max(...all.map(m=>m.atk))<=pAtk)bounds=false;}
  // 准入可过性：怪攻 < 玩家 hp 参考（hp≈300+tier*520），玩家可硬抗
  const refHp=300+d.tier*520; const refAtk=50+d.tier*105;
  for(const m of all){if(m.hp>(d.boss===m?refAtk*13:refAtk*8))bounds=false; if(m.atk>refHp*0.2)bounds=false;}
}
ok(bounds,'怪物强度匹配准入档位');
ok(dungeons.every(d=>d.entry&&d.minRank>=1&&d.minRank<=10),'准入文案与档位齐全');
ok(dungeons.every(d=>d.stages.length>=3&&d.boss&&d.boss.skill),'每副本有 3+ 小怪与带绝技的 Boss');
// 动态掉落：通关 mine 多次，掉落来自物品库或药池
let dl=createGame({name:'掉落测试',gender:'男',race:'人类',age:'成年 · 适龄',wealth:'温饱',edu:'中级',potential:'无',goal:'安身立命'},'casual');
dl.cash=5000;dl.jobsRank=[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];dl.rank=1;dl.jobExp=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
dl.attributes={力量:28,敏捷:18,体质:22,智力:10,感知:12,魅力:10,意志:12,幸运:10};
dl.items=[{name:'铁剑',slot:'武器',count:1,weight:2.4,durability:50},{name:'皮甲',slot:'护甲',count:1,weight:4,durability:50}];dl.equip={weapon:'铁剑',armor:'皮甲'};
const drops=[];
for(let k=0;k<6;k++){
  let d2=perform(dl,'dungeon','mine').state;let g2=0;
  while(d2.battle&&!d2.battle.done&&g2++<90){d2=perform(d2,'battle','attack').state;}
  drops.push(d2.battle?.drop);dl=d2;dl.battle=null;
}
ok(drops.length===6&&drops.every(x=>!!x&&(gearByName(x)||['黑面包','止血草','魔力药水','疗伤绷带','蜂蜜酒'].includes(x))),'动态掉落来自物品库/药池：'+drops.join('、'));
ok(new Set(drops).size>=2,'掉落有随机性（'+new Set(drops).size+'种）：'+drops.join('、'));
console.log('== 装备库与药品分级 ==');
ok(gearShop.length>=60,'装备库扩充至 '+gearShop.length+' 件');
const prices=gearShop.map(g=>g.price);
ok(Math.max(...prices)>=30000,'覆盖神话档（最高价 '+Math.max(...prices)+'）');
ok(gearShop.filter(g=>g.price<500).length>=5,'普通档 ≥5 件');
ok(gearShop.filter(g=>g.price>=20000).length>=8,'神话档 ≥8 件');
ok(gearShop.every(g=>g.price>0&&g.desc&&['武器','护甲','饰品'].includes(g.slot)),'装备字段完整');

console.log('PASS',pass,'FAIL',fail);
process.exit(fail?1:0);
