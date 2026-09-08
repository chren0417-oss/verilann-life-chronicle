import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('./lib/game.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createGame,perform,validSave,inherit,age,steps,events,difficulties,parseCommand}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const d=Object.fromEntries(steps.map(s=>[s.key,s.options[0]||'艾伦 · 男性']));Object.assign(d,{name:'艾伦',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银',potential:'罕见亲和'});
let checked=0;function check(v,msg){assert.ok(v,msg);checked++;}
let s=createGame(d);check(validSave(s),'new game passes validation');const first=structuredClone(s);let result=perform(s,'work');check(!result.error,'work succeeds');check(result.state.day===7,'work advances seven days');check(s.day===0&&s.cash===first.cash,'reducer leaves input untouched');check(result.state.cash>s.cash,'work income survives living expenses');s=result.state;
const before=JSON.stringify(s);result=perform(s,'train','不存在');check(!!result.error&&JSON.stringify(result.state)===before,'invalid actions have no state effects');
let poor=createGame({...d,wealth:'拮据 · 1银'});poor.cash=0;check(!!perform(poor,'buy','铁剑').error,'insufficient balance rejected');check(poor.items.length===3,'failed transaction does not add item');
const p=perform(s,'buy','黑面包').state;check(p.day===s.day&&p.items.find(i=>i.name==='黑面包').count===4,'shopping costs no day');check(p.cash===s.cash-6,'exact item charge');
const novice=createGame({...d,potential:'未显现'});check(!!perform(novice,'cast').error,'untrained magic rejected');check(!!perform(novice,'train','元素').error,'no potential blocks magic training');
const kid=createGame({...d,age:'童年 · 8岁'});check(!!perform(kid,'marry').error&&!!perform(kid,'job','1').error&&!!perform(kid,'estate').error,'child restrictions enforced');
const balances=Object.keys(difficulties).map(m=>perform(createGame(d,m),'work').state.cash);check(balances.every((v,i)=>i===0||v<balances[i-1]),'difficulty mechanically affects economics');
let e=createGame(d);e.event='wolf';e.seed=42;check(!!perform(e,'work').error,'pending event blocks unrelated action');const e1=perform(e,'event','0').state,e2=perform(e,'event','0').state;check(JSON.stringify(e1)===JSON.stringify(e2),'same state replays random outcome exactly');check(e1.event===null,'event resolved');
const archive=JSON.parse(JSON.stringify(e1));check(validSave(archive),'JSON round-trip valid');for(const bad of [{},{...archive,cash:-1},{...archive,region:99},{...archive,items:[{name:'a'}]},{...archive,skills:{}},{...archive,event:'missing'}])check(!validSave(bad),'malformed state rejected');
let q=createGame(d);q=perform(q,'quest').state;const count=q.quests.length;check(!!perform(q,'quest').error&&q.quests.length===count,'one active quest');check(!!perform(q,'deliver').error,'quest skill prerequisite');q.skills[q.quests[0].skill]=q.quests[0].need;q=perform(q,'deliver').state;check(q.quests[0].status==='已完成','quest completes');
let debt=perform(createGame(d),'borrow').state;check(debt.debt===1100,'loan records total repayment');debt=perform(debt,'repay').state;check(debt.debt===0,'repayment clears debt');
let long=createGame(d);long.cash=100000;for(let i=0;i<24;i++){long.event=null;long.injury=0;long.hp=100;long=perform(long,'year').state;check(validSave(long),'long life remains valid')};check(age(long)===42,'year fast-forward ages correctly');long.children=[{name:'希尔',born:0}];long.retired=true;const next=inherit(long);check(next&&next.day===long.day&&next.cash===long.cash&&next.generation===2,'inherit preserves world and assets');check(next&&validSave(next),'heir save valid');check(next.skills.锻造<long.skills.锻造,'heir does not copy veteran skills');
let many=createGame(d);many.cash=100000;for(let i=0;i<80;i++){if(many.event)many=perform(many,'event',String(events.find(e=>e.id===many.event).choices.length-1)).state;many=perform(many,i%3===0?'rest':'work').state;check(validSave(many),'repeated state remains valid')}
check(parseCommand('【属性】')[0]==='panel','panel command');check(parseCommand('训练 剑术')[1]==='剑术','training command');
console.log(`Passed ${checked} gameplay and persistence checks.`);

const saveSource=fs.readFileSync(new URL('./lib/save-state.ts',import.meta.url),'utf8');
const saveJS=ts.transpileModule(saveSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {pushHistory,popHistory,upsertSlot}=await import('data:text/javascript;base64,'+Buffer.from(saveJS).toString('base64'));
let history=[];let current=createGame(d);const start=JSON.stringify(current);history=pushHistory(history,current);current=perform(current,'work').state;const restored=popHistory(history);check(JSON.stringify(restored.game)===start,'undo restores complete prior state');check(restored.history.length===0,'undo consumes one history entry');check(popHistory([])===null,'empty undo intentional');
let slots=upsertSlot([],'a',current,history,'today');slots[0].label='原路线';const slotB=structuredClone(current);slotB.cash+=300;slots=upsertSlot(slots,'b',slotB,[],'today');const snapshot=JSON.stringify(slots[0]);slots=upsertSlot(slots,'b',perform(slotB,'rest').state,[],'tomorrow');check(JSON.stringify(slots.find(s=>s.id==='a'))===snapshot,'editing second slot preserves first');check(slots.length===2,'upsert does not duplicate slots');slots=upsertSlot(slots,'a',current,history,'later');check(slots.find(s=>s.id==='a').label==='原路线','autosave preserves custom name');
for(let i=0;i<25;i++)history=pushHistory(history,current);check(history.length===20,'history bounded to 20');const loaded=JSON.parse(JSON.stringify(slots));check(loaded.every(s=>validSave(s.game)&&s.history.every(validSave)),'slot JSON validates');console.log(`Passed ${checked} total checks, including independent slots and full-state undo.`);
