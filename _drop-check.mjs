// 掉落品质验证：按难度定品质范围
import {importTS} from './test-loader.mjs';
const {createGame,perform,dungeons,steps,gearQuality,gearByName,rollDrop}=await importTS('./lib/game.ts');
const d=Object.fromEntries(steps.map(x=>[x.key,x.options[0]||'艾伦 · 男性']));Object.assign(d,{name:'艾伦',gender:'男性',age:'成年 · 适龄',education:'工坊学艺',wealth:'宽裕 · 30银',potential:'罕见亲和'});
let pass=0,fail=0;
function check(v,name){if(v)pass++;else{fail++;console.log('FAIL:',name)}}

const tierMap={1:[1,2],2:[1,2],3:[2,3],4:[2,3],5:[3,4],6:[3,4],7:[4,5],8:[4,5],9:[5,6],10:[6,7]};
for(const [tier,[qlo,qhi]] of Object.entries(tierMap)){
  const g=createGame(d);
  const dg=dungeons.find(x=>x.tier===Number(tier));
  let bad=0, samples=[];
  for(let i=0;i<40;i++){
    const drop=rollDrop(g,dg);
    if(samples.includes(drop))continue;
    samples.push(drop);
    const gd=gearByName(drop);
    if(!gd){continue} // 药品跳过
    const q=gearQuality(gd.price);
    if(q<qlo||q>qhi){bad++;if(bad<=2)console.log('tier'+tier,'掉出范围:',drop,'品质',q,'期望',qlo+'-'+qhi)}
  }
  check(bad===0,'tier'+tier+' 掉落品质在 '+qlo+'-'+qhi);
}
// tier10 不应出现普通/优秀装备
const g=createGame(d);
const dg=dungeons.find(x=>x.tier===10);
let sawHigh=false;
for(let i=0;i<60;i++){
  const drop=rollDrop(g,dg);
  const gd=gearByName(drop);
  if(!gd)continue;
  if(gearQuality(gd.price)>=6)sawHigh=true;
}
check(sawHigh,'tier10 出现神话/不朽级装备');
console.log('PASS '+pass+' FAIL '+fail);
process.exit(fail?1:0);
