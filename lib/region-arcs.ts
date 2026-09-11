// ============================================================
// 维尔兰 · 六条地区长线 与 暮林《树根下的门》事件卡（region-arcs）
// 依据《维尔兰世界剧情圣经》§3/§7 实现
// 结构：StoryCard 事件卡（可编译为 Event 接入现有事件系统）
// 职业不决定事件是否出现，只改变可用选项和成功方式（§7.1）
// ============================================================
import type {Game,Choice} from './game';
import type {ArcState} from './story-state';
import {arcOf,arcSeen,hasArcFlag} from './story-state';
import type {NpcEffect} from './story-npcs';

// ---- 事件卡类型（§7.1 模板的落地）----
export type StoryCard = {
  id:string;                 // 唯一 ID（同时作为事件 id 与 history 记录）
  arcId:string;              // 所属地区弧线
  phase:number;              // 所在阶段（用于条件与展示）
  title:string;
  premise:string;            // 玩家看见的情境（Event.text）
  condition:(s:Game)=>boolean;
  deadline?:{key:string;days:number;onExpire:(s:Game,a:ArcState)=>string[]};
  choices:StoryChoice[];
  flags:string[];            // 卡完成后写入弧线旗标
};

export type StoryChoice = {
  id:string;
  label:string;
  detail:string;             // 行动 + 时间/费用/风险/所需能力（25–60 字）
  days:number;
  cost?:number;
  skill?:string;
  difficulty?:number;
  reward?:number;
  item?:string;
  fame?:number;
  hurt?:number;
  follow:string;             // 成功后的即时日志
  flag?:string;              // 非空 → 托管暂停等待玩家（重大/不可逆选择）
  npc?:NpcEffect[];          // NPC 关系变化
  arc?:Partial<Pick<ArcState,'tension'|'scarcity'|'danger'|'knowledge'|'phase'|'dominantFaction'>>;
  setFlags?:string[];
  clearFlags?:string[];
  deadline?:{key:string;days:number};   // 注册截止（出现即计时）
  clearDeadline?:string;
  killNpc?:string;
};

// ---- 六条地区长线元数据（§3）----
export type RegionArcMeta = {
  arcId:string;region:number;name:string;conflict:string;phases:string[];
};
export const regionArcs:RegionArcMeta[] = [
  {arcId:'loen-tax',region:0,name:'洛恩王国 · 河谷税册',conflict:'连年丰收却越来越多农户失地。王室以“战时粮税”加征，行会怀疑贵族囤粮抬价。',phases:['传闻：粮价异常、新税册','失衡：佃户退租、粮仓封存','对抗：行会与贵族互相指控','抉择：饥荒风险与征粮令并至','余波：新税制或地方自治']},
  {arcId:'castia-eagle',region:1,name:'卡斯蒂亚帝国 · 鹰旗与铁印',conflict:'北方边境军费失控。军务厅扩大征兵，贵族借军功争权，军工作坊依赖战事获利。',phases:['传闻：征兵令与军需订单','失衡：边境旅检与铁价上涨','对抗：军功贵族与文官角力','抉择：安全、功名、秩序与良知','余波：驻军、物价与伤兵']},
  {arcId:'north-oath',region:2,name:'北境诸领 · 长冬盟誓',conflict:'异常漫长的冬季提前到来，粮储不足，氏族争夺狼喉隘通行权。',phases:['传闻：入冬提前、粮价上涨','失衡：储粮告急、氏族摩擦','对抗：争夺隘口通行权','抉择：储粮、修路或调停','余波：皮毛价、人口与信任']},
  {arcId:'alma-ports',region:3,name:'阿尔玛自由城邦 · 十二席议会',conflict:'港口繁荣建立在债券与保险之上。一次沉船事故让多个商会濒临违约，议会想把损失转嫁给小商人。',phases:['传闻：沉船事故与保险赔付','失衡：商会违约、债券恐慌','对抗：议会、盐场与船坞互指','抉择：信用、走私与舆论','余波：港口格局的四种可能']},
  {arcId:'holy-candle',region:4,name:'圣辉教国 · 白烛与灰书',conflict:'罕见病在朝圣路线上扩散。白烛修会要封锁治疗；枢机主张焚毁以太资料并审查学者。',phases:['传闻：朝圣路上的怪病','失衡：药材涨价、修会封锁','对抗：焚书派与救治派','抉择：安全、真相与救治','余波：知识保存与教国走向']},
  {arcId:'mist-door',region:5,name:'暮林边境 · 树根下的门',conflict:'灰烬堡遗迹封印出现裂隙，森林动物异常迁徙；公会与商队想开采，精灵与守林者要求封锁。',phases:['传闻：雾根蘑菇失色','失衡：采药人失踪、入口确认','对抗：封锁令与三方立场','抉择：进入遗迹、遗物归属','余波：林缘代价与门后的名字']},
];

// 弧线名（用于 kind 标签）
export function arcName(arcId:string):string{
  return regionArcs.find(r=>r.arcId===arcId)?.name.split(' · ')[1]||arcId;
}

// ============================================================
// 暮林边境 · 树根下的门 —— 完整 8 步事件链（§7.2）
// ============================================================
const M='mist-door';
// 其余五国第一阶段 helpers（§3.1–§3.5）
const LO='loen-tax',CA='castia-eagle',NO='north-oath',AL='alma-ports',HO='holy-candle';
const inLoen=(s:Game)=>s.region===0,inCastia=(s:Game)=>s.region===1,inNorth=(s:Game)=>s.region===2,inAlma=(s:Game)=>s.region===3,inHoly=(s:Game)=>s.region===4;
const seenL=(s:Game,id:string)=>arcSeen(s,LO,id),seenC=(s:Game,id:string)=>arcSeen(s,CA,id),seenN=(s:Game,id:string)=>arcSeen(s,NO,id),seenA=(s:Game,id:string)=>arcSeen(s,AL,id),seenH=(s:Game,id:string)=>arcSeen(s,HO,id);

const inMist=(s:Game)=>s.region===5;
const seen=(s:Game,id:string)=>arcSeen(s,M,id);

export const storyCards:StoryCard[] = [
// ---------- 卡1 · 雾根蘑菇失色（起点） ----------
{
  id:'mist-door-1',arcId:M,phase:1,
  title:'雾根蘑菇失色',
  premise:`苔桥村的市集日，药草摊上堆着成捆的雾根蘑菇——灰绿色的伞盖本该带着露水的药香，可摊主面前的几筐，颜色发灰，闻起来只有土腥气。

草药师苔丝蹲在摊前，捡起一朵放在鼻尖，眉头越皱越紧。"失色了。"她说，"雾根蘑菇只在深林的菌脉上失色。那片林子，谁进去谁出事。"

你顺着她目光望去，村口那条通往灰烬堡的旧道，林影沉沉的。守林长艾琳·雾语恰好从集市边走过，她听见了苔丝的话，脚步顿了一下，却什么也没说，只是把目光投向灰烬堡方向。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-1')&&arcOf(s,M).phase===0,
  choices:[
    {id:'a',label:'采样调查',detail:'3日 · 生存/感知考验 · 深入林缘',days:3,skill:'生存',difficulty:12,reward:120,item:'古代碎片',follow:'你沿着失色菌脉向东探了一日，在苔藓下翻出一块刻着旧纹章的石片——林子里确实藏着什么。',npc:[{id:'mist-tess',affinity:8,trust:6}],arc:{knowledge:10,phase:1},setFlags:['mist-clue'],flag:'story:mist-door-1'},
    {id:'b',label:'收购异常药材',detail:'1日 · 贸易 · 30铜',days:1,cost:30,reward:90,follow:'你把几筐失色蘑菇收了下来。摩尔的人当晚就来打听货源——有人正急着要这批“坏药”。',npc:[{id:'mist-moore',interest:10}],arc:{tension:6,phase:1},setFlags:['mist-clue-guild'],flag:'story:mist-door-1'},
    {id:'c',label:'只当没看见',detail:'1日 · 观望',days:1,follow:'你把这桩怪事按回心底。日子照旧，只是夜里风声穿过林梢时，你总觉得林子在说什么。',arc:{danger:8,phase:1},setFlags:['mist-blind'],flag:'story:mist-door-1'},
  ],
  flags:['mist-clue'],
},
// ---------- 卡2 · 失踪的采药人（deadline 10 日） ----------
{
  id:'mist-door-2',arcId:M,phase:2,
  title:'失踪的采药人',
  premise:`第二天清晨，苔丝带着一朵失色的蘑菇叩响你的门。采药人莉亚进林三天未归——她临走前说，"要去看看菌脉为什么变灰"。

莉亚的家人站在苔丝身后，握着那朵蘑菇，指节发白。苔丝压低声音："守望者不肯进那片林子。你若肯去，活要见人，死要见尸。村里凑得出向导的钱，可他们只认你。"

窗外，通往灰烬堡的旧道被晨雾吞没。风从林子里带出一股说不清的甜腥气。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-2')&&arcOf(s,M).phase===1&&(hasArcFlag(s,M,'mist-clue')||hasArcFlag(s,M,'mist-clue-guild')||hasArcFlag(s,M,'mist-blind')),
  deadline:{key:'lydia',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    const ws=s.worldStory;if(ws&&ws.npcs['mist-lydia']&&ws.npcs['mist-lydia'].alive){
      ws.npcs['mist-lydia'].alive=false;a.danger=Math.min(100,a.danger+8);
      if(ws.npcs['mist-elin']){ws.npcs['mist-elin'].trust=Math.max(0,ws.npcs['mist-elin'].trust-6);ch.push('莉亚在林中遇难——你错过了营救的时机');ch.push('暮林危险 +8 · 守林长信任 −6');}
      else ch.push('莉亚在林中遇难——你错过了营救的时机');
    }
    if(!a.flags['mist-lydia-lost']){a.flags['mist-lydia-lost']=true;ch.push('苔桥村传言：采药人莉亚再也没回来');}
    return ch;
  }},
  choices:[
    {id:'a',label:'自行搜救',detail:'3日 · 生存/感知考验 · 高风险',days:3,skill:'生存',difficulty:20,reward:200,hurt:8,item:'疗伤绷带',follow:'你在菌脉尽头找到了莉亚——她摔进一条根缝里，腿断了，怀里还护着一筐样本。她喘着气说："那门……在发光。"',npc:[{id:'mist-lydia',affinity:30,trust:20,memory:'被玩家从根缝中救出'},{id:'mist-tess',trust:8}],arc:{knowledge:12,phase:2},setFlags:['mist-lydia-saved','mist-entrance'],flag:'story:mist-door-2'},
    {id:'b',label:'雇佣向导',detail:'2日 · 2银50铜 · 低风险',days:2,cost:250,reward:120,follow:'你花钱请守望者的一位老向导带路。第二天黄昏，向导背回了莉亚——她安然无恙，只是吓坏了。向导临走前低声说："林子里有扇门，封条是新的。"',npc:[{id:'mist-lydia',affinity:20,trust:15},{id:'mist-elin',trust:6,interest:8}],arc:{phase:2},setFlags:['mist-lydia-saved','mist-entrance'],flag:'story:mist-door-2'},
    {id:'c',label:'劝家属等待',detail:'1日 · 不冒险',days:1,follow:'你劝莉亚的家人再等等——或许她只是迷了路。夜里，你听见窗外有人压着嗓子哭。',arc:{danger:4,phase:2},setFlags:['mist-wait'],flag:'story:mist-door-2'},
  ],
  flags:['mist-lydia-saved'],
},
// ---------- 卡3 · 灰烬堡的封锁令（三方立场） ----------
{
  id:'mist-door-3',arcId:M,phase:2,
  title:'灰烬堡的封锁令',
  premise:`入口被确认的第三天，守林长艾琳·雾语以“灰枝守望者”之名宣布：封锁灰烬堡周边三里，任何人不得靠近裂隙。

药剂师公会会长摩尔当场拍了桌子：“封锁？那些材料够救多少人命！我们有一整条朝圣路的病人等着用药！”外来商队的代表则晃着一卷盖着六国旧约会火漆的通行文书，声称开采权早已在案。

三拨人僵在灰烬堡营地的篝火前，火光照得每个人的影子都拉得很长。最后，他们不约而同看向你——一个既不属于守望者、也不属于公会和商队的局外人。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-3')&&arcOf(s,M).phase>=2&&(hasArcFlag(s,M,'mist-entrance')||hasArcFlag(s,M,'mist-secret-path')),
  choices:[
    {id:'a',label:'支持封锁',detail:'1日 · 交涉 · 声望',days:1,fame:5,follow:'你站在守望者一边。艾琳微微颔首，封条连夜加厚。可你看见摩尔在人群里看了你很久。',npc:[{id:'mist-elin',trust:12},{id:'mist-moore',interest:-15}],arc:{tension:-5,phase:2},setFlags:['mist-side-watcher'],flag:'story:mist-door-3'},
    {id:'b',label:'申请勘探许可',detail:'3日 · 5银 · 公会',days:3,cost:500,reward:300,follow:'你向公会递了申请。摩尔亲自盖了章，还塞给你一份“合理开采”的地图——图上标着裂隙的位置，墨迹未干。',npc:[{id:'mist-moore',trust:10}],arc:{danger:12,tension:6,phase:2},setFlags:['mist-side-guild'],flag:'story:mist-door-3'},
    {id:'c',label:'偷越封锁',detail:'2日 · 潜行考验 · 高风险 · 声望下降',days:2,skill:'潜行',difficulty:26,reward:500,hurt:10,fame:-8,follow:'你趁夜色摸过封锁线，在旧道尽头发现一条直通裂隙的暗径。回来时靴底沾着发蓝的苔泥——这条路，封条拦不住。',arc:{knowledge:8,danger:10,phase:2},setFlags:['mist-side-rogue','mist-secret-path'],flag:'story:mist-door-3'},
  ],
  flags:['mist-side-watcher','mist-side-guild','mist-side-rogue'],
},
// ---------- 卡4 · 谁与你同行 ----------
{
  id:'mist-door-4',arcId:M,phase:3,
  title:'谁与你同行',
  premise:`入林前夜，苔桥村酒馆的火塘边，三盏灯摆在你面前。

守望者推来一盏油灯，灯芯浸过守林人的松脂：“林子认路，我认你。”学者摊开半卷羊皮，上面用细笔描着旧星庭的纹章：“我只要真相，分文不取。”商会的雇员则把一张银票轻轻按在桌上：“摩尔会长说了，带回来的东西，公会按市价收，三倍。”

三双眼睛。树根下的门只能打开一次——或者说，你希望它只被打开一次。火塘里的柴噼啪响了一声。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-4')&&arcOf(s,M).phase>=2&&(hasArcFlag(s,M,'mist-side-watcher')||hasArcFlag(s,M,'mist-side-guild')||hasArcFlag(s,M,'mist-side-rogue')),
  choices:[
    {id:'a',label:'守望者同行',detail:'2日 · 同行者降低风险',days:2,follow:'守望者向导走在你前面，脚步无声，避开三处会塌的根桥。他说，森林会记住走过的人。',npc:[{id:'mist-elin',trust:8}],arc:{danger:-6,phase:3},setFlags:['mist-party-watcher'],flag:'story:mist-door-4'},
    {id:'b',label:'学者同行',detail:'3日 · 真相解读加成',days:3,reward:150,follow:'学者沿途辨认纹章与菌脉走向，在笔记本上画满草图。“这扇门，”他笃定地说，“封的不是路，是名字。”',arc:{knowledge:18,danger:4,phase:3},setFlags:['mist-party-scholar'],flag:'story:mist-door-4'},
    {id:'c',label:'商会雇员同行',detail:'2日 · 高风险 · 报酬加成',days:2,reward:400,follow:'雇员揣着银票同行，一路盘算着能搬走多少。你看得出，他眼里的光比灯还亮——也更容易被别的光引走。',npc:[{id:'mist-moore',interest:10}],arc:{danger:14,phase:3},setFlags:['mist-party-guild'],flag:'story:mist-door-4'},
    {id:'d',label:'独行',detail:'2日 · 独自承担一切',days:2,reward:200,arc:{danger:20,knowledge:10,phase:3},setFlags:['mist-party-alone'],follow:'你谢绝了所有同行者。林子里只有你一个人的脚步声——和门后面若有若无的呼吸。',flag:'story:mist-door-4'},
  ],
  flags:['mist-party-watcher','mist-party-scholar','mist-party-guild','mist-party-alone'],
},
// ---------- 卡5 · 根室中的旧门（不可逆） ----------
{
  id:'mist-door-5',arcId:M,phase:4,
  title:'根室中的旧门',
  premise:`顺着菌脉深入，树根在头顶交缠成穹顶，苔藓发出幽蓝的微光。根室中央，一扇刻着旧星庭纹章的石门半开着，裂隙里透出更亮的光——像有东西在里面呼吸。

以太在脚下涌动，像潮汐拍打礁石。门后的空气带着一种古老的甜腥，和雾根蘑菇失色的味道一模一样。

苔丝的话在耳边响起：“谁进去谁出事。”但现在，门在你面前。缝隙够一个人侧身通过，而那道光，正在缓缓变暗。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-5')&&arcOf(s,M).phase>=3&&(hasArcFlag(s,M,'mist-party-watcher')||hasArcFlag(s,M,'mist-party-scholar')||hasArcFlag(s,M,'mist-party-guild')||hasArcFlag(s,M,'mist-party-alone')),
  choices:[
    {id:'a',label:'封回裂隙',detail:'3日 · 结界/生存考验 · 高风险',days:3,skill:'结界',difficulty:30,hurt:12,item:'圣水',follow:'你与同行者搬来根石与苔泥，一层层封住裂隙。蓝光在指缝间挣扎了一夜，最终沉寂。门关了——至少现在是关了。',npc:[{id:'mist-elin',trust:10}],arc:{danger:-30,knowledge:10,phase:4},setFlags:['mist-sealed'],flag:'story:mist-door-5'},
    {id:'b',label:'取走核心',detail:'2日 · 元素/调查考验 · 极险',days:2,skill:'元素',difficulty:28,reward:800,item:'霜陨剑',hurt:14,follow:'你探手入缝，触到一枚温热的晶体。拔出的瞬间，整座根室发出一声叹息，蓝光彻底熄灭。你带着那枚核心——和门的死寂——退出林外。',arc:{danger:20,knowledge:25,phase:4},setFlags:['mist-core'],flag:'story:mist-door-5'},
    {id:'c',label:'记录并撤离',detail:'2日 · 识字/占卜考验',days:2,skill:'识字',difficulty:24,reward:300,item:'古代碎片',follow:'你不敢动那扇门，只把纹章、菌脉走向与门缝里的光描进了笔记。学者说，这些足够考据很多年——也可能足够惹祸很多年。',arc:{knowledge:35,phase:4},setFlags:['mist-recorded'],flag:'story:mist-door-5'},
  ],
  flags:['mist-sealed','mist-core','mist-recorded'],
},
// ---------- 卡6 · 带回来的东西 ----------
{
  id:'mist-door-6',arcId:M,phase:4,
  title:'带回来的东西',
  premise:`你带着从根室里取出的东西走出林缘。阳光落下来的那一刻，行囊里那东西微微发烫，像有生命。

守望者的人远远站着，目光钉在你身上；摩尔的信差等在村口，手里握着草拟的收据；还有一名穿白袍的修会信使——消息传得比脚步快。

三个人，三种开价，三种理由：森林、病人、真相。无论你把东西交给谁，另外两拨人都会在暗处记住你的名字。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-6')&&arcOf(s,M).phase>=4&&(hasArcFlag(s,M,'mist-sealed')||hasArcFlag(s,M,'mist-core')||hasArcFlag(s,M,'mist-recorded')),
  choices:[
    {id:'a',label:'交白烛修会',detail:'1日 · 声望',days:1,fame:8,follow:'你把东西交给白袍信使。她郑重欠身：“修会会封存它，直到我们知道它是什么。”远处，守望者的人沉默地退开。',arc:{knowledge:10,phase:4},setFlags:['mist-artifact-holy'],flag:'story:mist-door-6'},
    {id:'b',label:'交药剂师公会',detail:'1日 · 6银',days:1,reward:600,follow:'摩尔的信差当场点银交付，又塞给你一张公会贵宾卡。“会长说，你往后买药，一律八折。”',npc:[{id:'mist-moore',trust:12}],arc:{danger:8,phase:4},setFlags:['mist-artifact-guild'],flag:'story:mist-door-6'},
    {id:'c',label:'交守望者',detail:'1日 · 信任',days:1,follow:'你把东西放进艾琳手中。她沉默了很久，最终说：“林子欠你一次。往后你来，守望者的路为你开。”',npc:[{id:'mist-elin',trust:12}],arc:{danger:-10,phase:4},setFlags:['mist-artifact-watcher'],flag:'story:mist-door-6'},
    {id:'d',label:'隐瞒自留',detail:'1日 · 声望下降 · 高收益',days:1,item:'龙心吊坠',fame:-6,follow:'你谎称林里什么都没有。夜里，那东西在枕下微微发光。你梦见一扇门，和一个被抹去的名字。',arc:{danger:15,knowledge:5,phase:4},setFlags:['mist-artifact-hidden'],flag:'story:mist-door-6'},
  ],
  flags:['mist-artifact-holy','mist-artifact-guild','mist-artifact-watcher','mist-artifact-hidden'],
},
// ---------- 卡7 · 林缘的代价 ----------
{
  id:'mist-door-7',arcId:M,phase:5,
  title:'林缘的代价',
  premise:`裂隙没有完全封住。第三夜，兽群从林缘涌出，踏坏了苔桥村东头的药田；两名猎户被病气放倒，浑身滚烫，苔丝的草药压不住烧。

村里人围在火堆边，有人骂守望者封而不治，有人骂商队招来了祸事，更多的人只是看着你——是你带回那扇门的消息，也是你带回了那扇门的东西。

火光照着一张张疲惫的脸。天亮前，总得有人先开口。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-7')&&arcOf(s,M).phase>=4&&(hasArcFlag(s,M,'mist-artifact-holy')||hasArcFlag(s,M,'mist-artifact-guild')||hasArcFlag(s,M,'mist-artifact-watcher')||hasArcFlag(s,M,'mist-artifact-hidden')),
  choices:[
    {id:'a',label:'救援村民',detail:'3日 · 医术/生存考验',days:3,skill:'医术',difficulty:28,reward:400,item:'疗伤绷带',follow:'你连日采药、喂药、守夜。两名猎户退了烧，苔丝红着眼睛说：“这两条命，是你抢回来的。”',npc:[{id:'mist-tess',trust:12}],arc:{danger:-12,phase:5},setFlags:['mist-rescue'],flag:'story:mist-door-7'},
    {id:'b',label:'组织封林',detail:'2日 · 礼仪考验 · 声望',days:2,skill:'礼仪',difficulty:22,fame:6,follow:'你召集村民伐木设障，把兽群挡在村外，也把进林的路堵了一半。艾琳亲自带人来加固封线，说“做得对”。',npc:[{id:'mist-elin',trust:10}],arc:{scarcity:10,danger:-8,phase:5},setFlags:['mist-protect'],flag:'story:mist-door-7'},
    {id:'c',label:'扩大开采',detail:'4日 · 10银 · 高收益',days:4,reward:1000,follow:'你带着公会的雇工重返裂隙，把封条换成了采掘架。银钱流入村子，苔丝却再也不肯接过你递的药。',npc:[{id:'mist-moore',trust:10},{id:'mist-tess',affinity:-12}],arc:{danger:18,phase:5},setFlags:['mist-exploit'],flag:'story:mist-door-7'},
  ],
  flags:['mist-rescue','mist-protect','mist-exploit'],
},
// ---------- 卡8 · 门后的名字（终局 · 碎冠线索） ----------
{
  id:'mist-door-8',arcId:M,phase:5,
  title:'门后的名字',
  premise:`尘埃落定。苔桥村的药田重新长出新苗，雾根蘑菇的成色渐渐恢复正常——只有你自己知道，那扇门后藏着什么。

整理遗物时，你在那枚裂开的石片背面，发现一个被苔衣掩盖的名字。它和旧星庭时代的文献对得上，也和你辗转听说的“碎冠之夜”传闻隐隐相连。

知道这个名字的人，如今只剩你——和苔丝那本泛黄的草药笔记。门可以关上，但知道名字的人，总会再回去。`,
  condition:s=>inMist(s)&&!seen(s,'mist-door-8')&&arcOf(s,M).phase>=5&&(hasArcFlag(s,M,'mist-rescue')||hasArcFlag(s,M,'mist-protect')||hasArcFlag(s,M,'mist-exploit')),
  choices:[
    {id:'a',label:'公开真相',detail:'1日 · 声望大涨',days:1,fame:12,follow:'你把发现写成文书，交给守望者与行会各一份。苔桥村的火塘边，人们念着那个名字，念完便沉默了。',npc:[{id:'mist-tess',trust:8},{id:'mist-elin',trust:8}],arc:{knowledge:20,phase:5,dominantFaction:'灰枝守望者'},setFlags:['mist-truth-public'],flag:'story:mist-door-8'},
    {id:'b',label:'毁掉记录',detail:'1日 · 降低风险',days:1,follow:'你把石片砸碎，扔进炉火。灰烬落进苔桥河。夜里你睡得比任何时候都沉——也梦得比任何时候都空。',npc:[{id:'mist-elin',trust:8}],arc:{danger:-10,phase:5},setFlags:['mist-truth-burned'],flag:'story:mist-door-8'},
    {id:'c',label:'留给后代',detail:'1日 · 声望 · 传承',days:1,fame:6,item:'古代碎片',follow:'你把这个名字抄进家中的账册夹页，连同那段见闻。若有一天有人翻到，会知道这扇门后曾发生过什么。',arc:{knowledge:10,phase:5},setFlags:['mist-truth-heirloom'],flag:'story:mist-door-8'},
  ],
  flags:['mist-truth-public','mist-truth-burned','mist-truth-heirloom'],
},
// ============================================================
// 洛恩王国 · 河谷税册 —— 第一阶段（§3.1）
// ============================================================
{ // 卡1 · 传闻：粮价异常、新税册
  id:'loen-tax-1',arcId:LO,phase:1,
  title:'新税册',
  premise:`灰河镇的秋市比往年冷清。粮价贴着"战时粮税"的告示涨了三成，税吏却换了一本更厚的册子，挨家挨户登记田亩——登记过的农户，隔天就有人上门"核对"，核对完，地契便换了个名字。

酒馆里，镇长赫尔曼·灰河给自己倒了第三杯酒，叹气说："上面要的，我拦不住。"行会会长贝拉却把账本拍在桌上："税册里多算的亩数，够买三座谷仓。谁信这是王都的意思？"

门外，新来的税务官赛门·霍姆正低着头核对一卷文书，指节发白。你端着酒经过，他叫住你，声音很轻："你……识字吗？"`,
  condition:s=>inLoen(s)&&!seenL(s,'loen-tax-1')&&arcOf(s,LO).phase===0,
  choices:[
    {id:'a',label:'帮邻里核算税册',detail:'3日 · 识字考验 · 核对田亩与税额',days:3,skill:'识字',difficulty:14,reward:150,follow:'你把三户邻居的田亩数一一核对，发现税册上多算了两成。带着证据去找贝拉时，她眯起眼看了你很久，说："你这样的人，行会用得着。"',npc:[{id:'loen-bella',trust:10,affinity:6}],arc:{knowledge:12,phase:1},setFlags:['loen-audit'],flag:'story:loen-tax-1'},
    {id:'b',label:'低价收粮囤货',detail:'2日 · 1银50铜 · 贸易',days:2,cost:150,reward:450,follow:'你趁乱收了几车存粮，藏在行会旧仓。赫尔曼路过时皱了皱眉，没说什么——但你看见他在税册上把你的名字，添到了"殷实户"一栏。',npc:[{id:'loen-bella',interest:8},{id:'loen-hermann',interest:-6}],arc:{scarcity:8,tension:6,phase:1},setFlags:['loen-hoard'],flag:'story:loen-tax-1'},
    {id:'c',label:'替税吏跑腿登记',detail:'1日 · 礼仪考验',days:1,skill:'礼仪',difficulty:10,reward:100,fame:4,follow:'你陪赛门挨户登记，替他说了不少软话，也帮他挡下几回白眼。收工时，他低声道谢，又补了一句："这册子上有些数……连我也不全信。"',npc:[{id:'loen-simon',trust:10}],arc:{tension:-4,phase:1},setFlags:['loen-clerk'],flag:'story:loen-tax-1'},
  ],
  flags:['loen-audit','loen-hoard','loen-clerk'],
},
{
  id:'loen-tax-2',arcId:LO,phase:2,
  title:'粮仓封存',
  premise:`王室征粮令隔日送达：灰河镇的官仓即日起封存，任何人不得开仓。封条贴上的当晚，三户佃农被房东逐出，行李堆在街心；贝拉堵在仓门口，指着封条骂到嗓子哑。

赫尔曼躲进了镇公所，只传出一句话："照办，别闹事。"而赛门连夜收拾了行囊——有人看见他往王都方向递了一封信，信里夹着一枚家传的银戒指。

夜里，被逐的佃农蜷在墙角，向你伸出手，指缝里夹着一张揉皱的地契："这上面……多画了一亩，画的是我家的地。"`,
  condition:s=>inLoen(s)&&!seenL(s,'loen-tax-2')&&arcOf(s,LO).phase>=1&&(arcOf(s,LO).flags['loen-audit']||arcOf(s,LO).flags['loen-hoard']||arcOf(s,LO).flags['loen-clerk']),
  deadline:{key:'loen-evict',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('封仓令生效满十日，又有五户佃农失地，逃往邻镇');
    a.tension=Math.min(100,a.tension+8);a.scarcity=Math.min(100,a.scarcity+6);
    const ws=s.worldStory;if(ws&&ws.npcs['loen-hermann']){ws.npcs['loen-hermann'].trust=Math.max(0,ws.npcs['loen-hermann'].trust-6);ch.push('赫尔曼镇长信任 −6 —— 你没能在他最难的时候伸手');}
    return ch;
  }},
  choices:[
    {id:'a',label:'护送账本赴王都',detail:'4日 · 潜行/骑术考验 · 高风险',days:4,skill:'潜行',difficulty:26,reward:350,follow:'你带着贝拉抄录的税册副本，避开税吏耳目连夜出镇。王都的旧友替你转呈了文书——回程时，赛门追到渡口，低声说："税署撤了对灰河的加征令。你救了这镇子，也救了我。"',npc:[{id:'loen-bella',trust:12},{id:'loen-simon',trust:12}],arc:{knowledge:18,tension:-10,phase:2},setFlags:['loen-ledger'],flag:'story:loen-tax-2'},
    {id:'b',label:'组织佃户互助',detail:'3日 · 礼仪/指挥考验',days:3,skill:'礼仪',difficulty:18,reward:200,fame:6,follow:'你牵头把失地佃户编成互助组，替他们联络邻镇的地主与短工。赫尔曼从镇公所探出半个头，看了一下午，终于叹了口气："镇子要是有两个你就好了。"',npc:[{id:'loen-hermann',trust:10,affinity:6}],arc:{scarcity:-6,tension:-4,phase:2},setFlags:['loen-help'],flag:'story:loen-tax-2'},
    {id:'c',label:'买通守仓人偷运存粮',detail:'2日 · 3银 · 贸易 · 高风险',days:2,cost:300,reward:700,follow:'你用银钱买通守仓的老卒，趁夜偷运出半仓陈粮，转手高价卖给邻镇。钱是赚到了，可第二天封条下多了一具看守的尸体——有人把这事捅到了王都。',npc:[{id:'loen-bella',interest:6,affinity:-6}],arc:{danger:14,tension:8,phase:2},setFlags:['loen-smuggle'],flag:'story:loen-tax-2'},
  ],
  flags:['loen-ledger','loen-help','loen-smuggle'],
},
// ============================================================
// 卡斯蒂亚帝国 · 鹰旗与铁印 —— 第一阶段（§3.2）
// ============================================================
{ // 卡1 · 传闻：征兵令与军需订单
  id:'castia-eagle-1',arcId:CA,phase:1,
  title:'征兵令',
  premise:`鹰嘴堡城门今晨贴出新的征兵令：凡十六岁以上男丁，秋收后须应募入伍，戍边一年。告示下围满了人——有人攥着锄头，有人攥着银币，都想挤到前面再看一眼"军饷每月六银"那行字。

铁匠行会会长维塔·铁砧站在自家铺子门口，敲着铁砧说："军单涨价了，涨两成。想打的，拿钱来。"驿站主伊莲娜把一封盖着火漆的信掖进怀里，冲你眨眨眼："王都那位卢修斯大人，又往边境塞人了。"

傍晚，一队新兵在城门口集合。队伍末尾，有个少年抱着新发的铁盔，眼泪在眼眶里打转，没敢让它掉下来。`,
  condition:s=>inCastia(s)&&!seenC(s,'castia-eagle-1')&&arcOf(s,CA).phase===0,
  choices:[
    {id:'a',label:'应征入伍',detail:'3日 · 剑术/骑术考验 · 军饷',days:3,skill:'剑术',difficulty:18,reward:500,fame:8,follow:'你披上军服编入鹰嘴堡前哨。操练的间隙，大元帅瓦里安路过校场，在你面前停了一停："使剑的架势还行。边境缺的就是肯把命押在刀口上的人。"',npc:[{id:'castia-varian',trust:8,affinity:6}],arc:{tension:6,phase:1},setFlags:['castia-enlist'],flag:'story:castia-eagle-1'},
    {id:'b',label:'承包军需订单',detail:'3日 · 5银 · 贸易',days:3,cost:500,reward:900,follow:'你以行会名义签下军需供货契，从铁砧坊订购军靴与箭杆。维塔·铁砧亲自验了你的定金，难得咧嘴："账目清楚，打仗也清楚——你这人，行。"',npc:[{id:'castia-vita',trust:10,interest:10}],arc:{scarcity:8,phase:1},setFlags:['castia-supply'],flag:'story:castia-eagle-1'},
    {id:'c',label:'放走逃兵',detail:'2日 · 潜行考验 · 风险',days:2,skill:'潜行',difficulty:22,reward:120,follow:'你替那个抱铁盔的少年换了便衣，从驿站的侧门送出城。伊莲娜假装没看见，只在收你房钱时压低了声音："边境上，心软的人命短。你保重。"',npc:[{id:'castia-elena',trust:12,affinity:6}],arc:{danger:10,phase:1},setFlags:['castia-harbor'],flag:'story:castia-eagle-1'},
  ],
  flags:['castia-enlist','castia-supply','castia-harbor'],
},
{
  id:'castia-eagle-2',arcId:CA,phase:2,
  title:'边境旅检',
  premise:`征兵令颁布半月后，鹰嘴堡通往北境的官道增设了三道旅检。过关要验身份文书，文书要盖驿站的章，盖章要排队，排队要花钱。伊莲娜的驿站被扣下两车皮货，说"货单与实物不符"。

铁器价格又涨了一成，铁砧坊的学徒们累得在炉边打盹。而城北的空地上，伤兵一天比一天多——有人断了腿，有人烧得说胡话，军医人手不够，只能靠草药勉强吊着命。

伊莲娜把一杯热酒推到你面前，眼下一片青黑："帮我个忙吧。这关，快过不下去了。"`,
  condition:s=>inCastia(s)&&!seenC(s,'castia-eagle-2')&&arcOf(s,CA).phase>=1&&(arcOf(s,CA).flags['castia-enlist']||arcOf(s,CA).flags['castia-supply']||arcOf(s,CA).flags['castia-harbor']),
  deadline:{key:'castia-check',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('旅检持续加严，商路半断，边境物价再涨');
    a.tension=Math.min(100,a.tension+8);a.scarcity=Math.min(100,a.scarcity+8);
    const ws=s.worldStory;if(ws&&ws.npcs['castia-elena']){ws.npcs['castia-elena'].trust=Math.max(0,ws.npcs['castia-elena'].trust-5);ch.push('伊莲娜信任 −5 —— 她的驿站被拖垮了');}
    return ch;
  }},
  choices:[
    {id:'a',label:'护送伤兵回城',detail:'4日 · 医术/骑术考验',days:4,skill:'医术',difficulty:26,reward:400,fame:6,follow:'你一路照料伤员，把七个重伤的兵士活着送进城。军医官握住你的手连声道谢；瓦里安在城头目送你们入城，向你行了一个军礼。',npc:[{id:'castia-varian',trust:12}],arc:{knowledge:10,danger:-8,phase:2},setFlags:['castia-medic'],flag:'story:castia-eagle-2'},
    {id:'b',label:'伪造过境文书',detail:'2日 · 识字/潜行考验 · 高风险',days:2,skill:'识字',difficulty:28,reward:600,follow:'你仿照驿站印信连夜赶制文书，替伊莲娜的皮货过了关。她如数付了钱，却把那份假文书收进了铁匣："这东西能救命，也能要命——别让它流出去。"',npc:[{id:'castia-elena',trust:8}],arc:{danger:16,phase:2},setFlags:['castia-forge-pass'],flag:'story:castia-eagle-2'},
    {id:'c',label:'向卢修斯递请愿书',detail:'3日 · 礼仪考验 · 声望',days:3,skill:'礼仪',difficulty:20,reward:250,fame:8,follow:'你借驿站的信使把请愿书递进王都，请首席大臣放宽旅检。回信比想象中快，措辞客气得滴水不漏："边务繁重，望卿体谅。"——至少，旅检松了一天。',npc:[{id:'castia-lucius',trust:6,interest:6}],arc:{tension:-8,phase:2},setFlags:['castia-petition'],flag:'story:castia-eagle-2'},
  ],
  flags:['castia-medic','castia-forge-pass','castia-petition'],
},
// ============================================================
// 北境诸领 · 长冬盟誓 —— 第一阶段（§3.3）
// ============================================================
{ // 卡1 · 传闻：入冬提前、粮价上涨
  id:'north-oath-1',arcId:NO,phase:1,
  title:'提前的雪',
  premise:`第一场雪落下来那天，冻溪镇的柴火还堆在院子里没来得及收。老猎户们说，这样的雪，往年要再等一个月。

粮铺门口排起了长队，掌柜把"面粉限购"的木牌挂了三遍。冻溪族长艾琳·冻溪站在自家的粮仓前，看着只剩半仓的谷子，眉头拧成了结。议会女长老希尔达连夜召集各氏族议事，火塘边挤满了人。

大领主布兰恩·白霜最后开口，声音像冻过的石头："雪来得早，狼来得更早。隘口先封起来，谁家粮不够，拿猎获来换。"有人应和，有人冷笑——粮不够的氏族，连猎获都没有。`,
  condition:s=>inNorth(s)&&!seenN(s,'north-oath-1')&&arcOf(s,NO).phase===0,
  choices:[
    {id:'a',label:'运粮接济冻溪',detail:'3日 · 5银 · 贸易/耕种',days:3,cost:500,reward:200,follow:'你从南方商队手里匀出粮车，冒雪送到冻溪。艾琳·冻溪亲自接的粮，沉默地拍了拍你的肩，半晌说了句："雪地里记恩的人少，你算一个。"',npc:[{id:'north-elin',trust:12,affinity:8}],arc:{scarcity:-10,phase:1},setFlags:['north-grain'],flag:'story:north-oath-1'},
    {id:'b',label:'组猎队围猎',detail:'3日 · 弓术/生存考验',days:3,skill:'弓术',difficulty:18,reward:450,follow:'你带着一队猎手深入北林，七天猎回七头鹿。肉分到各家，孩子的哭声少了。希尔达在火塘边点头："会打猎的人，冬天饿不死自己，也饿不死邻居。"',npc:[{id:'north-hilda',trust:8,affinity:6}],arc:{danger:-6,phase:1},setFlags:['north-hunt'],flag:'story:north-oath-1'},
    {id:'c',label:'探路寻冬猎地',detail:'4日 · 生存考验 · 高风险',days:4,skill:'生存',difficulty:26,reward:300,follow:'你独自北上探路，在暴雪里摸到一片尚未封冻的河谷，鹿群正聚在那里过冬。回来时你半边脸冻伤，却带回了最值钱的消息。布兰恩听完，罕见地让人给你端了碗热汤。',npc:[{id:'north-bran',trust:8}],arc:{knowledge:12,danger:8,phase:1},setFlags:['north-scout'],flag:'story:north-oath-1'},
  ],
  flags:['north-grain','north-hunt','north-scout'],
},
{
  id:'north-oath-2',arcId:NO,phase:2,
  title:'狼喉隘之争',
  premise:`雪越积越深，狼喉隘成了各氏族的命门。冻溪要封隘保冬猎地，灰峰要开隘换南方粮食，两族族长在议会上拍案对骂，几乎动刀。

更糟的消息随后传来：有人在隘口的旧矿洞里，撞见布兰恩的长子罗德里克和几个南方商人密谈——商人们带来了采矿契，印泥还新鲜。

布兰恩当众把儿子抽了一顿，却压不下各族的猜疑。希尔达找上你，把一个盖着议会火漆的布袋塞进你手里："隘口不能乱。你走一趟，把路趟平——或者，把真相带回来。"`,
  condition:s=>inNorth(s)&&!seenN(s,'north-oath-2')&&arcOf(s,NO).phase>=1&&(arcOf(s,NO).flags['north-grain']||arcOf(s,NO).flags['north-hunt']||arcOf(s,NO).flags['north-scout']),
  deadline:{key:'north-pass',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('隘口之争拖成械斗，两族各伤数人，冬天更难熬了');
    a.tension=Math.min(100,a.tension+10);a.danger=Math.min(100,a.danger+6);
    const ws=s.worldStory;if(ws&&ws.npcs['north-bran']){ws.npcs['north-bran'].trust=Math.max(0,ws.npcs['north-bran'].trust-5);ch.push('布兰恩·白霜信任 −5 —— 他失望于无人调停');}
    return ch;
  }},
  choices:[
    {id:'a',label:'调停两族',detail:'3日 · 礼仪/指挥考验',days:3,skill:'礼仪',difficulty:20,reward:250,fame:8,follow:'你在议会上替两族逐条核算粮账与猎获，把"谁欠谁"摆到台面上。吵了三天的会，终于在一纸换粮契上落了锤。希尔达冲你点头："北方欠你一份人情。"',npc:[{id:'north-hilda',trust:12},{id:'north-elin',trust:8}],arc:{tension:-12,phase:2},setFlags:['north-mediate'],flag:'story:north-oath-2'},
    {id:'b',label:'查采矿交易真相',detail:'3日 · 潜行/占卜考验 · 高风险',days:3,skill:'潜行',difficulty:28,reward:400,follow:'你潜入旧矿洞，翻出罗德里克与商人签的契书副本——那契书比布兰恩知道的更深：商队背后，是阿尔玛的汇兑商会。布兰恩看完契书，沉默了很久："家门不幸。"',npc:[{id:'north-bran',trust:10}],arc:{knowledge:18,tension:6,phase:2},setFlags:['north-investigate'],flag:'story:north-oath-2'},
    {id:'c',label:'押粮冒险过隘',detail:'4日 · 贸易/生存考验 · 高风险',days:4,cost:300,reward:700,follow:'你押着粮车趁雪夜摸过狼喉隘，把粮食送进冻溪。路是趟通了，可隘口的风雪也记住了你的脚印——下一次，未必还让你过。',npc:[{id:'north-elin',trust:10}],arc:{scarcity:-10,danger:12,phase:2},setFlags:['north-caravan'],flag:'story:north-oath-2'},
  ],
  flags:['north-mediate','north-investigate','north-caravan'],
},
// ============================================================
// 阿尔玛自由城邦 · 十二席议会 —— 第一阶段（§3.4）
// ============================================================
{ // 卡1 · 传闻：沉船事故与保险赔付
  id:'alma-ports-1',arcId:AL,phase:1,
  title:'沉船之夜',
  premise:`白鸥号在距白帆港半日航程处触礁沉没，船上三十七人，只救回九人。第二天清早，港口的保险行门前就排起了索赔的长队——可赔付的数目，比保单上写的，少了一半。

盐场工人停工了，船坞的工匠围在议政厅门口讨说法。首席执政官梅拉·沃德当众宣读"事故审查令"，声音平稳得像念账目。港务长卡洛·帆把帽子往地上一摔："审查？先查查保单是谁改的！"

汇兑商会的伊索端着酒杯远远看着，笑眯眯地对你说："城邦嘛，账目清楚，什么都好谈。"`,
  condition:s=>inAlma(s)&&!seenA(s,'alma-ports-1')&&arcOf(s,AL).phase===0,
  choices:[
    {id:'a',label:'出席听证作证',detail:'2日 · 礼仪考验 · 声望',days:2,skill:'礼仪',difficulty:14,reward:200,fame:6,follow:'你在听证会上如实陈述所见，把船坞工人拖欠工钱的账目摆上桌。梅拉当众许诺重查赔付——散会后，她叫住你，语气郑重："城邦需要肯说真话的人。"',npc:[{id:'alma-maira',trust:10}],arc:{tension:-6,phase:1},setFlags:['alma-hearing'],flag:'story:alma-ports-1'},
    {id:'b',label:'收购船坞债券',detail:'3日 · 10银 · 贸易 · 高风险',days:3,cost:1000,reward:1400,follow:'你用低价吃进船坞的债券，赌议会会救市。伊索在汇兑所门口遇见你，笑容更深了："胆子不小。若城邦垮了，这纸就是废纸；若垮不了，你就发了。"',npc:[{id:'alma-iso',interest:10}],arc:{danger:10,phase:1},setFlags:['alma-bonds'],flag:'story:alma-ports-1'},
    {id:'c',label:'替卡洛查沉船真相',detail:'3日 · 潜行/占卜考验 · 高风险',days:3,skill:'潜行',difficulty:24,reward:350,follow:'你潜水摸过白鸥号的残骸，在货舱底发现被凿穿的船板——那不是触礁，是人为。卡洛听完，把酒碗重重一放："老子就知道。这账，要有人还。"',npc:[{id:'alma-kalo',trust:12,affinity:6}],arc:{knowledge:15,danger:8,phase:1},setFlags:['alma-probe'],flag:'story:alma-ports-1'},
  ],
  flags:['alma-hearing','alma-bonds','alma-probe'],
},
{
  id:'alma-ports-2',arcId:AL,phase:2,
  title:'挤兑恐慌',
  premise:`"白鸥号系人为沉没"的消息像潮水一样漫过全港。第二天清晨，伊索的汇兑所前排起长队——人人都要取回存款。柜台后的伙计手忙脚乱，银箱见了底。

议会紧急磋商到半夜，梅拉提的"城邦担保"议案被盐场席位否决；卡洛带着船坞工人堵住议政厅，要求先发欠薪；码头上的货主开始抛售货物，白帆港的物价半天涨了三回。

伊索找到你，难得收起笑脸，把一卷债券递到你面前："帮个忙。城邦的信用，今天要是塌了，明天海面上漂的就是咱们所有人的尸体。"`,
  condition:s=>inAlma(s)&&!seenA(s,'alma-ports-2')&&arcOf(s,AL).phase>=1&&(arcOf(s,AL).flags['alma-hearing']||arcOf(s,AL).flags['alma-bonds']||arcOf(s,AL).flags['alma-probe']),
  deadline:{key:'alma-run',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('挤兑潮压垮三家汇兑行，城邦信用崩盘，港口贸易减半');
    a.tension=Math.min(100,a.tension+12);a.scarcity=Math.min(100,a.scarcity+10);
    const ws=s.worldStory;if(ws&&ws.npcs['alma-maira']){ws.npcs['alma-maira'].trust=Math.max(0,ws.npcs['alma-maira'].trust-5);ch.push('梅拉·沃德信任 −5 —— 她独自扛下了烂摊子');}
    return ch;
  }},
  choices:[
    {id:'a',label:'组织工人复工',detail:'3日 · 礼仪/指挥考验',days:3,skill:'礼仪',difficulty:20,reward:300,fame:8,follow:'你带着船坞工头挨个码头劝回工人，先发一半欠薪，余款立契。卡洛亲自督工，三天后船坞重新响起锤声——梅拉站在船坞门口，难得露出一点笑意。',npc:[{id:'alma-kalo',trust:12},{id:'alma-maira',trust:6}],arc:{scarcity:-8,tension:-6,phase:2},setFlags:['alma-reopen'],flag:'story:alma-ports-2'},
    {id:'b',label:'注资稳定汇兑',detail:'2日 · 20银 · 贸易',days:2,cost:2000,reward:800,follow:'你把积蓄押进汇兑所，当众立誓"先赔船工、再结商款"。挤兑的队伍松动了一角。伊索抹了把汗，罕见地没谈利息："这笔账，城邦记你的。"',npc:[{id:'alma-iso',trust:12,interest:10},{id:'alma-maira',trust:8}],arc:{tension:-10,phase:2},setFlags:['alma-inject'],flag:'story:alma-ports-2'},
    {id:'c',label:'低价抄底债券',detail:'2日 · 8银 · 贸易 · 高风险',days:2,cost:800,reward:1600,follow:'你趁恐慌吃进一批盐场债券，赌危机过后暴涨。伊索看着你直摇头："这时候还想着发财的，不是疯子，就是将来能当议长的。"',npc:[{id:'alma-iso',interest:6,affinity:-4}],arc:{danger:16,phase:2},setFlags:['alma-bottom'],flag:'story:alma-ports-2'},
  ],
  flags:['alma-reopen','alma-inject','alma-bottom'],
},
// ============================================================
// 圣辉教国 · 白烛与灰书 —— 第一阶段（§3.5）
// ============================================================
{ // 卡1 · 传闻：朝圣路上的怪病
  id:'holy-candle-1',arcId:HO,phase:1,
  title:'朝圣路上的热病',
  premise:`圣泉镇的朝圣驿站里，一名朝圣者突然高热倒地，舌头底下浮起一片青斑。第二天，同样的症状在三个驿站同时出现。

大修院院长克拉拉第一时间封锁了朝圣路段，亲自守着病人擦洗降温。枢机奥古斯丁却在同一夜签发了搜查令——"查所有接触过灰书的学者"。圣泉药园总管罗莎的药架上，能退热的药只剩最后两捆。

病人在隔间里烧得说胡话，反复念着一个词。罗莎握着你的手，声音发颤："草药不够了。你……能帮我弄些药来吗？"`,
  condition:s=>inHoly(s)&&!seenH(s,'holy-candle-1')&&arcOf(s,HO).phase===0,
  choices:[
    {id:'a',label:'采药支援药园',detail:'3日 · 医术/生存考验',days:3,skill:'医术',difficulty:16,reward:250,follow:'你按罗莎的方子进山采回退热的药草，连夜熬成汤剂。病人们退了烧，罗莎红着眼眶把一包草药塞进你怀里："往后你来药园，药材随你取。"',npc:[{id:'holy-rosa',trust:12,affinity:8}],arc:{scarcity:-8,phase:1},setFlags:['holy-herb'],flag:'story:holy-candle-1'},
    {id:'b',label:'查热病病源',detail:'3日 · 医术/占卜考验 · 高风险',days:3,skill:'医术',difficulty:24,reward:300,item:'圣水',follow:'你解剖了一具病亡的朝圣者，在血里找到一丝微弱的蓝光——那不是病，是蚀入血肉的以太。克拉拉听完沉默良久："这病……不是天上掉的。"',npc:[{id:'holy-clara',trust:10}],arc:{knowledge:15,danger:8,phase:1},setFlags:['holy-probe'],flag:'story:holy-candle-1'},
    {id:'c',label:'护送学者躲避审查',detail:'2日 · 潜行考验 · 风险',days:2,skill:'潜行',difficulty:22,reward:150,follow:'你连夜把一位被搜查的学者送出镇，藏进修院地窖。学者临走塞给你半页泛黄的纸："灰书的残页，你若信我，拿去。"远处，奥古斯丁的卫队举着火把，正挨户敲门。',npc:[{id:'holy-clara',trust:8,affinity:6}],arc:{danger:12,phase:1},setFlags:['holy-refuge'],flag:'story:holy-candle-1'},
  ],
  flags:['holy-herb','holy-probe','holy-refuge'],
},
{
  id:'holy-candle-2',arcId:HO,phase:2,
  title:'焚书令',
  premise:`朝圣路上的热病蔓延到第三个镇子，枢机奥古斯丁在圣泉广场当众宣布：烧毁修院地窖里所有涉及以太的"灰书"残页，任何私藏者，以异端论处。

广场上堆起柴垛，修院学徒们抱着书箱走出地窖，有人低着头，有人咬着嘴唇。克拉拉站在柴垛前，声音不高却字字清楚："烧了书，病不会好。它只会变成没人认识的病。"

罗莎在你耳边低语："地窖最里面还有一箱残页，没登记在册。你若肯动手，天亮前能运出镇。"奥古斯丁的目光扫过人群，最后落在你身上，像在看一份还没签字的搜查令。`,
  condition:s=>inHoly(s)&&!seenH(s,'holy-candle-2')&&arcOf(s,HO).phase>=1&&(arcOf(s,HO).flags['holy-herb']||arcOf(s,HO).flags['holy-probe']||arcOf(s,HO).flags['holy-refuge']),
  deadline:{key:'holy-burn',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('灰书残页被焚，相关以太知识从此失传');
    a.knowledge=Math.max(0,a.knowledge-10);a.tension=Math.min(100,a.tension+6);
    const ws=s.worldStory;if(ws&&ws.npcs['holy-clara']){ws.npcs['holy-clara'].trust=Math.max(0,ws.npcs['holy-clara'].trust-6);ch.push('克拉拉信任 −6 —— 她没能保住那些书');}
    return ch;
  }},
  choices:[
    {id:'a',label:'偷运灰书残页',detail:'2日 · 潜行/元素考验 · 高风险',days:2,skill:'潜行',difficulty:26,reward:300,item:'古代碎片',follow:'你趁夜色从地窖暗门搬出那箱残页，藏进城外废弃的磨坊。克拉拉望着你，眼眶泛红："这些纸上记的，可能是救命的方子，也可能是杀人的咒。你选了前者。"',npc:[{id:'holy-clara',trust:12},{id:'holy-augustine',interest:-12}],arc:{knowledge:15,danger:10,phase:2},setFlags:['holy-rescue'],flag:'story:holy-candle-2'},
    {id:'b',label:'公开辩论救书',detail:'3日 · 礼仪考验 · 声望',days:3,skill:'礼仪',difficulty:22,reward:250,fame:8,follow:'你在广场上与奥古斯丁当众辩论，以病人的病历为据，为"知其所以然"争得一线转机。围观的信徒散去时，有人在柴垛上浇了水。枢机没有撤销命令，却也没有立刻点火。',npc:[{id:'holy-clara',trust:8},{id:'holy-augustine',interest:-6}],arc:{tension:-8,phase:2},setFlags:['holy-debate'],flag:'story:holy-candle-2'},
    {id:'c',label:'以治疗成效说服枢机',detail:'4日 · 医术/礼仪考验',days:4,skill:'医术',difficulty:26,reward:400,follow:'你把热病患者的治疗全程整理成册，在枢机面前逐一展示：退烧、除斑、复元。奥古斯丁翻到最后一页，沉默良久，最终只说了句："病要治，书……再议。"',npc:[{id:'holy-rosa',trust:10},{id:'holy-augustine',trust:6}],arc:{scarcity:-6,tension:-6,phase:2},setFlags:['holy-prove'],flag:'story:holy-candle-2'},
  ],
  flags:['holy-rescue','holy-debate','holy-prove'],
},
];
