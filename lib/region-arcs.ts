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
];
