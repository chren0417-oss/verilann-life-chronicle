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
  volume?:number;             // 长篇：卷号（saga）
  chapter?:number;            // 长篇：章号
  forkPoint?:boolean;         // 长篇：是否关键节点（不同选择→不同后续）
  branch?:string;             // 长篇：所属分支（'A'|'B'|'C'…或 'main'）
  arcId:string;              // 所属地区弧线（NPC 关系事件用 'npc'，跨区终局用 'crown-night'）
  phase:number;              // 所在阶段（用于条件与展示）
  kindName?:string;          // 自定义 kind 标签（缺省为 剧情 · 地区名）
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
  battle?:{name:string;hp:number;atk:number;def:number}|'auto'; // 剧情战斗（'auto'=按玩家实时实力映射敌人）
  failFollow?:string;        // 战斗失败/逃跑后的结局文本（走失败支线）
  failFlags?:string[];       // 失败支线旗标
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

// 碎冠之夜：六条地区线的完成度（跨区终局触发依据，§2/§7.2 卡8）
const crownProgress=(s:Game):number=>{
  const ws=s.worldStory;if(!ws)return 0;
  let n=0;
  for(const id of [LO,CA,NO,AL,HO,M]){
    const a=ws.arcs[id];
    if(a&&a.phase>=4)n++;
  }
  return n;
};
const seenCrown=(s:Game,id:string)=>arcSeen(s,'crown-night',id);

const mistSagaCards:StoryCard[]=[
{id:'mist-s1',arcId:M,phase:1,volume:1,chapter:1,forkPoint:false,kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'雾根蘑菇失色',
premise:'秋分前七天，苔桥村的雾根蘑菇开始变色。\n\n苔丝是村里第一个发现的。她清晨背着竹篓从雾根林边缘回来，篓底那层银灰色的蘑菇泛着一层不祥的暗紫，像被谁用墨汁从根部浸过。她把蘑菇举到屋檐下看了又看，又凑到鼻尖——那股熟悉的、带着露水气的菌香不见了，取而代之的是一种腐甜的、近似于陈旧蜜蜡的气味。\n\n"这是雾根菇。"她对围过来的村民说，声音压得很低，"我采了三十年的雾根菇，从没见它们这样过。"\n\n有人不信，把蘑菇掰开，断面里渗出黑紫色的汁液，沾在指尖上洗不掉。苔丝脸色发白，她转身就去了村口的药铺，把整篓蘑菇扣在柜台上。药铺掌柜捏起一片，眉头越皱越紧，最后只说了句："这药性全变了。原来治咳喘的，现在……我不敢说它治什么。"\n\n消息传开的速度比秋风吹得快。当天下午，苔桥村来了两拨人。\n\n先到的是灰枝守望者的守林长艾琳·雾语。她披着灰绿色的斗篷，腰间挂着一柄没有鞘的短刀，刀锋磨得发亮。她没进村，只站在村口的石桥上，远远看着林缘的方向，问了苔丝三句话：蘑菇什么时候变的色、林里有没有动物的尸体、夜里有没有听到铃声。苔丝一一答了，艾琳听完沉默了很久，最后说："从今天起，雾根林边缘的采集，先停了吧。"\n\n后到的是药剂师公会的马车。赶车的是公会的伙计，车上坐着会长摩尔。摩尔是个圆脸的中年人，说话总带着笑，下车先给每个围观的村民发了铜子，说是"收购样本的辛苦钱"。他出的价是市价的三倍，把苔丝那筐变色的蘑菇尽数收走，临走时还留下话："往后凡是变色的雾根菇，苔桥村有多少，公会收多少。"\n\n苔丝攥着那三倍的铜子，心里却越来越冷。她把钱塞回兜里，回头看见你站在人群边上——一个不属于苔桥村的人，却把这些事从头看到了尾。\n\n那天夜里，苔桥村的风向变了。\n\n先是守夜的猎狗集体冲着林缘狂吠，拽都拽不住；接着有人听见林子里传来一种极轻的、像银铃又像骨哨的声音，一响就是大半夜。天亮时，雾根林边缘的三棵老橡树树皮上，出现了三道平行的、深黑色的爪痕——那爪痕的间距，不像任何一种苔桥村人认识的野兽。\n\n苔丝把门闩插了两道，夜里翻来覆去，总想起那朵蘑菇断面里渗出的黑紫色汁液。她不知道，此刻在雾根林更深处，有什么东西正借着越来越浓的夜雾，一步一步，朝苔桥村的方向走来。\n\n而你，恰好站在这一切的开端。',
flags:[],
condition:s=>s.region===5&&arcOf(s,M).phase===0&&!arcOf(s,M).flags['mist-saga']&&!arcSeen(s,M,'mist-s1'),
choices:[
{id:'a',label:'采样调查',detail:'3日 · 生存/感知考验 · 夜探林缘',days:3,skill:'生存',difficulty:16,battle:'auto',follow:'你握着火把沿林缘摸进雾根林。腐木深处，一头浑身缠着黑菌丝的腐木妖扑了出来——你把它砍翻在地，从它爪间抢下几株变色的雾根菇。样本到手，但那东西的巢穴，隐约在更深的雾里。',failFollow:'腐木妖的爪子比想象中更狠。你拼力挣脱，后背留下一道深痕，跌跌撞撞逃回苔桥村。样本丢了，伤口的血浸透半边衣裳——而那腐甜的菌香，似乎一路跟到了村口。',failFlags:['mist-s1-bad'],setFlags:['mist-saga'],arc:{phase:1,knowledge:5,danger:6}},
{id:'b',label:'收购异常药材',detail:'1日 · 贸易 · 30铜',days:1,cost:30,reward:90,skill:'贸易',difficulty:5,follow:'你赶在公会马车之前，用市价把苔丝剩下的变色蘑菇收了下来。夜里你对着油灯翻看那些暗紫色的菌褶，发现纹路里藏着一圈极细的、像文字又像树根年轮的刻痕。你说不上这是什么，但你知道——这东西值钱的不是药性，是秘密。',setFlags:['mist-saga'],arc:{phase:1,knowledge:3}},
{id:'c',label:'只当没看见',detail:'1日 · 观望',days:1,follow:'你决定不趟这浑水。苔丝看向你的眼神暗了一瞬，没再说什么。可那一夜铃声响起的时候，你比谁都醒得早——有些事，不是你装作没看见，就不会找上门来的。',setFlags:['mist-saga'],arc:{phase:1,tension:6}},
]},
{id:'mist-s2',arcId:M,phase:2,volume:1,chapter:2,forkPoint:true,deadline:{key:'mist-lydia',days:10,onExpire:(s,a)=>{const ly=s.worldStory?.npcs?.['mist-lydia'];if(ly)ly.alive=false;a.danger=Math.min(100,(a.danger||0)+6);return['莉亚在林中遇难……十日之期已过，苔桥村再没等到她回来。','地区危险 +6'];}},kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'失踪的采药人',
premise:'采药人莉亚是三天前失踪的。\n\n她失踪前最后见过她的人，是苔桥村磨坊的老汉。那天清早，莉亚背着比别人大一圈的竹篓往雾根林走，老汉冲她喊了一句"今儿雾气重"，她回头笑了笑，说"采完这趟就歇了"。那之后，再没人见过她。\n\n三天里，村里人找遍了雾根林外围，只找到她丢在溪边的水囊，和一截被扯断的捆药绳。绳头上沾着暗紫色的黏液——和那些变色的蘑菇，是同一个颜色。\n\n苔丝坐在莉亚家门口，眼睛通红。莉亚是她的徒弟，也是苔桥村最年轻的采药人。她攥着那截断绳对你说："她不会迷路的。雾根林她闭着眼都能走出来。是林子出了问题——自从那些蘑菇变色，林子就不是原来的林子了。"\n\n消息传到了灰枝守望者那里。艾琳·雾语当天下午赶到，围着溪边转了三圈，蹲下来捻了捻那截绳子上的黏液，脸色沉了下去。\n\n"这不是野兽留下的。"她说，"野兽撕东西，不会这么整齐。这是……什么东西在收集。"\n\n她没解释"收集"是什么意思，但村里人当晚都听见了，林缘的铃声又响了，比前一天更近。\n\n入夜，苔丝把一包干粮和一盏旧油灯塞进你手里。\n\n"你是外人，本不该管苔桥村的事。"她说，声音抖了一下，"可莉亚……她还活着。我能感觉到。你要是愿意进林子找她——"\n\n她没把话说完，只是望着雾根林深处那团浓得化不开的黑。\n\n风从林子里灌出来，带着腐甜的菌香。你听见了那铃声——这一次，清晰得就像在耳边。',
flags:[],
condition:s=>s.region===5&&arcOf(s,M).flags['mist-saga']&&arcOf(s,M).phase>=1&&!arcSeen(s,M,'mist-s2'),
choices:[
{id:'a',label:'自行搜救',detail:'3日 · 生存/感知考验 · 高风险',days:3,skill:'生存',difficulty:22,battle:'auto',follow:'你循着断绳的方向深入雾根林。第三日傍晚，你在腐木堆成的巢穴边找到了莉亚——她活着，只是昏迷，脚边趴着三头被雾根菌丝缠住咽喉的林狼。你手起刀落，狼群四散。背起莉亚回村时，她半梦半醒地抓住你的衣领，说了一句："树根……会说话……"',failFollow:'林狼比想象中凶悍。你护着身后的莉亚，被狼群逼得节节败退，最后只能抱着她从陡坡滚下，甩脱追兵。莉亚还在林子里。你负伤回到苔桥村，苔丝看到你满身的血，一句话也说不出来——而林缘的铃声，比任何时候都响。',failFlags:['mist-k1-bad'],setFlags:['mist-k1-save'],arc:{knowledge:8,danger:5},deadline:{key:'mist-lydia',days:10}},
{id:'b',label:'雇佣向导',detail:'2日 · 2银50铜 · 低风险',days:2,cost:250,reward:120,skill:'生存',difficulty:8,follow:'瘸腿老卢收下钱，二话不说带你进了林。他不走大路，专挑兽道和废弃的伐木径，边走边念叨："雾根林我走了四十年，闭着眼都知道哪儿能踩、哪儿不能踩。"第三日清晨，他在一片塌陷的旧矿道口停住——洞口有新踩的脚印，尺码不大，是莉亚的。矿道壁上，刻着一枚被树根缠绕的灰烬徽记。',setFlags:['mist-k1-guide'],arc:{knowledge:10}},
{id:'c',label:'劝家属等待',detail:'1日 · 不冒险',days:1,follow:'你劝莉亚的家人再等等——或许她只是迷了路，或许天亮就会回来。可那一夜，苔桥村所有人都听见了林子里传来的一声闷响，像什么沉重的东西倒了下去。第二天清晨，莉亚的水囊被放在村口石桥上，里面装满了暗紫色的黏液。没人敢碰它。苔丝盯着那只水囊看了很久，转身走进屋里，关上了门。',setFlags:['mist-k1-wait'],arc:{tension:8,danger:6}},
]},
{id:'mist-s3a',arcId:M,phase:2,volume:1,chapter:3,branch:'A',kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'林雾深处',
premise:'莉亚醒来时，已经是回到苔桥村的第二天。\n\n她喝了两碗热粥，才慢慢开口说话。她说自己是在采雾根菇时被一根从地下翻出来的树根绊倒的，那树根粗得像人的腰，表面湿滑，泛着暗紫色的光。她爬起来想绕开，却发现脚下整片地面都在微微起伏——像有什么巨大的东西，在土层下面翻身。\n\n"我跑，那些东西就追。"莉亚说，"不是野兽，是声音。像有人在我耳朵边唱歌，唱得我心里发慌，腿就不听使唤了。后来我摔进那条旧矿道，才躲过那些声音。"\n\n她摊开手掌，掌心有一道被什么划破的伤口，伤口周围的皮肤泛着不正常的青紫色。\n\n艾琳·雾语听完，一言不发地出了门，在村口站到天黑。\n\n你手里还攥着从腐木妖巢穴带回来的那几株变色蘑菇。现在，你比任何人都清楚：雾根林的病，已经从蘑菇传染到了土地，又传染到了人。\n\n该由谁来知道这一切？',
flags:[],
condition:s=>arcOf(s,M).flags['mist-k1-save']&&!arcSeen(s,M,'mist-s3a'),
choices:[
{id:'a',label:'交给艾琳',detail:'1日 · 守望者信任',days:1,skill:'交涉',difficulty:6,follow:'你把样本交给艾琳。她借光看了很久，指尖在暗紫色的菌褶上轻轻拂过，最后只说了一句："这不是药性变了。这是有东西，在借雾根林传信。"她收下样本，看你的眼神比之前暖和了些。守望者从此把你当自己人。',npc:[{id:'mist-elin',affinity:8,trust:8}],arc:{knowledge:4},setFlags:['mist-s3-elin']},
{id:'b',label:'自己留着',detail:'1日 · 潜藏',days:1,skill:'潜行',difficulty:8,follow:'你没有把样本交给任何人。夜里你把蘑菇压在箱底，用油布裹了三层。有些秘密，知道的人越少越安全——至少你现在是这么告诉自己的。只是你翻来覆去，总觉得那腐甜的菌香，隔着油布也能闻到。',arc:{knowledge:2},setFlags:['mist-s3-self']},
{id:'c',label:'交给苔丝',detail:'1日 · 药剂师公会',days:1,skill:'医术',difficulty:10,follow:'苔丝接过样本，用银刀刮下菌褶里的黏液，滴进一碗清水。水立刻变成浑浊的暗紫色，泛着细密的气泡。她盯着那碗水看了很久，声音很轻："这东西……在活。"她把样本收进药柜，锁了两道锁。',npc:[{id:'mist-tess',affinity:10,trust:6}],arc:{knowledge:6},setFlags:['mist-s3-tess']},
]},
{id:'mist-s3b',arcId:M,phase:2,volume:1,chapter:3,branch:'B',kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'向导的账',
premise:'旧矿道的入口，比老卢说的还要深。\n\n老卢举着火把走在前面，火光在矿壁上投下长长的影子。他一边走一边数着步数，时不时蹲下来捻一捻地上的土："这矿道是三十年前废弃的——当年这儿出过事故，埋了七个人，矿主赔不起，连夜跑了。之后灰枝守望者就把这附近封了，说是矿道下面压着什么不干净的东西。"\n\n"压着什么？"你问。\n\n老卢没答，只把火把往前方探了探。\n\n矿道尽头，是一扇被树根缠绕的旧石门。门缝里渗着暗紫色的光，像有心脏在里面跳动。莉亚的脚印，就消失在门前。\n\n老卢在门前站了很久，最后把火把往你手里一塞，退了三步。\n\n"钱我不要了。"他说，"那扇门后面的事，不是我这个瘸子该管的。你要是听我一句劝——今天这门，你也别进。"\n\n树根在门缝里微微蠕动。门后传来极轻的、像呼吸一样的声音。',
flags:[],
condition:s=>arcOf(s,M).flags['mist-k1-guide']&&!arcSeen(s,M,'mist-s3b'),
choices:[
{id:'a',label:'记下位置返回',detail:'1日 · 谨慎',days:1,follow:'你深深看了那扇门一眼，把位置牢牢记在心里，转身跟着老卢退出了矿道。有些门，打开之前得先想清楚代价。回村的路上，你数了数树根的数量——一、二、三……它们都在朝着那扇门的方向生长。',arc:{knowledge:6},setFlags:['mist-s3-loc']},
{id:'b',label:'报告艾琳',detail:'1日 · 守望者',days:1,skill:'交涉',difficulty:8,follow:'你把矿道和那扇门的事一五一十告诉了艾琳。她听完沉默了很久，最后说："那扇门，我们守望者找了它十二年。"她看了你一眼，声音里多了一丝从未有过的郑重："你帮我找到了它。这情，我记下了。"',npc:[{id:'mist-elin',trust:12,affinity:6}],arc:{knowledge:8},setFlags:['mist-s3-elin']},
{id:'c',label:'独自再探',detail:'2日 · 潜行/生存考验 · 高风险',days:2,skill:'潜行',difficulty:20,follow:'你趁夜独自潜回矿道。门缝里的光更亮了，暗紫色的纹路像血管一样沿着树根蔓延。你伸手碰了一下门面——那树根竟然缓缓让开了一道缝。门后是浓得化不开的黑暗，黑暗深处，有什么东西正发出绵长的、呼吸般的声响。你终究没有踏进去，但你已经确定：这扇门，是活的。',arc:{knowledge:12,danger:8},setFlags:['mist-s3-probe']},
]},
{id:'mist-s3c',arcId:M,phase:2,volume:1,chapter:3,branch:'C',kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'一夜无话',
premise:'莉亚的水囊被放回村口石桥的第二天，苔桥村安静得可怕。\n\n没有人再提采药的事。磨坊停了工，药铺关了门，连平日里最热闹的井台边，也只剩几个妇人压着嗓子说话。林缘的铃声没有再响——这反而更让人心慌，像是那东西知道猎物已经慌了，不再需要出声。\n\n黄昏时，苔丝找到了你。\n\n她瘦了一圈，眼窝深陷，手里攥着那只装过暗紫色黏液的水囊。\n\n"我该进林子找她的。"她说，"我采了三十年药，不该让一个小姑娘替我进那片林子。"\n\n她抬起头，目光里有一种近乎偏执的光：\n\n"你要是肯帮我——帮我进一次林子，找找她。哪怕找不到，我也认了。可你要是不肯，我就自己去。"\n\n远处，艾琳·雾语带着两名守望者进了村，正挨家挨户地敲着门。她在传达封锁令：从明早起，雾根林全面封禁。\n\n封锁令一下，就再没人能进林子里找莉亚了。',
flags:[],
condition:s=>arcOf(s,M).flags['mist-k1-wait']&&!arcSeen(s,M,'mist-s3c'),
choices:[
{id:'a',label:'答应苔丝进林',detail:'2日 · 生存考验 · 高风险',days:2,skill:'生存',difficulty:18,follow:'你在封锁令下达前的最后一夜，带着苔丝的油灯进了林子。灯油烧到一半时，你在腐木堆里找到了莉亚的竹篓——篓底躺着一朵完整无损的暗紫色蘑菇，像被谁精心摆放过。篓边有新挖的痕迹，一路向林深处延伸。你没能找到莉亚，但你带回了线索：她不是走丢的，是有什么东西，把她带走了。',setFlags:['mist-k1-track'],arc:{knowledge:8,danger:4}},
{id:'b',label:'安抚苔丝',detail:'1日 · 交涉',days:1,skill:'交涉',difficulty:10,follow:'你按住苔丝的肩膀，让她冷静下来："你进林子，只会多搭上一条命。让我来想办法。"苔丝看了你很久，终于点了点头。她把自己这些年记的雾根林药图塞给你——上面标着每一处泉眼、兽道和采药人的窝棚。这份地图，比任何向导都值钱。',npc:[{id:'mist-tess',trust:12,affinity:8}],arc:{knowledge:4},setFlags:['mist-tess-map']},
{id:'c',label:'去找艾琳交涉',detail:'1日 · 交涉 · 守望者',days:1,skill:'交涉',difficulty:12,follow:'你在村口截住了艾琳，把莉亚失踪、水囊被放回的事一五一十告诉她，最后问："封锁之前，能不能让我进一次林子？"艾琳盯着你看了很久，久到你以为她会拒绝。最后她说："天亮前回来。否则，守望者不认人。"她侧身让开了路。',npc:[{id:'mist-elin',trust:10}],arc:{knowledge:5},setFlags:['mist-elin-leash']},
]},
];
const mistSagaCards2:StoryCard[]=[
{id:'mist-s4',arcId:M,phase:2,volume:1,chapter:4,forkPoint:false,flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'苔桥的夜',
premise:'那天夜里，苔桥村的灯，一盏也没灭。\n\n先是磨坊的驴发了疯似的嘶叫，挣断缰绳，一头撞在院墙上。接着，雾根林边缘的鸟群呼啦啦地飞起来，在夜空里打着转，不肯落下。\n\n然后铃声又响了。\n\n这一次，所有人都听清了——那声音不是从林子里传出来的，是从林子上方的雾里。像有人在半空中摇着一串银铃，从雾根林的方向，一路向苔桥村移过来。\n\n猎狗趴在地上，夹着尾巴呜咽。\n\n艾琳·雾语站在村口，手按在刀柄上，眼睛一眨不眨地盯着雾线。她身后，两名守望者正把一桶桶灰白色的粉末沿着村界撒成一条线——那是浸过圣盐的灰烬，据说是灰枝守望者对付林地邪祟的老法子。\n\n"这不是第一次了。"艾琳对围拢的村民说，声音不高，却压过了风声，"十二年前，灰烬堡出过一次事。那之后，我们守望者守着这片林子，守了十二年。"\n\n"现在，那扇门又开了。"\n\n人群安静了一瞬。\n\n药剂师公会的马车也停在村口。摩尔下了车，脸上那常挂着的笑不见了，他望着林缘的方向，声音很低："门开了……这东西，比我想的来得快。"\n\n你站在人群里，白天那一幕幕在脑子里转：变色的蘑菇、失踪的采药人、腐木妖的巢穴、矿道深处那扇被树根缠绕的门。苔桥村的人把目光投向你——你是外人，可这一夜，你比谁都更接近那片林子的真相。\n\n艾琳的目光穿过人群，落在你身上。\n\n"你。"她说，"跟我来。"',
condition:s=>s.region===5&&(arcOf(s,M).flags['mist-k1-save']||arcOf(s,M).flags['mist-k1-guide']||arcOf(s,M).flags['mist-k1-wait'])&&!arcSeen(s,M,'mist-s4'),
choices:[
{id:'a',label:'帮忙布防',detail:'2日 · 生存实践',days:2,skill:'生存',difficulty:8,follow:'你跟着守望者沿村界撒灰、加固栅栏、布置陷阱。凌晨时分，雾线在村口停住，像撞上了一堵无形的墙——灰烬线泛起微光，铃声戛然而止。艾琳看着你，难得地点了点头："你手脚利落，比那些只会看热闹的强。"这一夜，苔桥村守住了。',npc:[{id:'mist-elin',trust:10,affinity:6}],setFlags:['mist-saga-2'],arc:{phase:2,danger:-4}},
{id:'b',label:'找摩尔探口风',detail:'1日 · 交涉',days:1,skill:'交涉',difficulty:10,follow:'你在马车边截住了摩尔。他起初打着官腔，直到你提到矿道里那扇被树根缠住的门，他脸色才变了一瞬。\n"那扇门……"他压低声音，"不是这一两年的事。我们公会等它，等了比守望者更久。"他塞给你一张皱巴巴的羊皮纸，上面画着灰烬堡一带的矿道图，其中一条用红笔标到尽头："天亮前想清楚，要不要跟我合作。"',npc:[{id:'mist-moore',affinity:8,interest:10}],setFlags:['mist-saga-2'],arc:{phase:2,knowledge:6}},
{id:'c',label:'回屋睡一觉',detail:'1日 · 养精蓄锐',days:1,follow:'你选择在这乱糟糟的夜里睡上一觉。铃声在午夜停了，像被什么掐断。清晨你推开窗，看见苔桥村口的灰烬线上，多了一串极细的脚印——那脚印不像人的，也不像任何你认识的兽的。艾琳蹲在脚印边，脸色沉得能拧出水。',setFlags:['mist-saga-2'],arc:{phase:2,danger:6}},
]},
{id:'mist-s5',arcId:M,phase:3,volume:1,chapter:5,forkPoint:true,flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'灰烬堡的封锁令',
premise:'灰烬堡在雾根林正北，是旧星庭时代留下的一座残堡，废弃了三百年。\n\n三百年来，灰枝守望者守着它，不许任何人靠近。他们说堡下压着东西，压着旧星庭没来得及带走的秘密。\n\n现在，那座残堡的墙根下，裂开了一道半人宽的缝。\n\n裂缝深处渗着暗紫色的光，和雾根蘑菇一个颜色。裂缝周围的地面上，树根虬结，像活物一样盘绕着那道缝，仿佛在阻止什么出来，又仿佛在迎接什么。\n\n封锁令是艾琳·雾语在天亮时当众宣读的：\n\n"自今日起，灰烬堡方圆五里，禁入。违者，守望者有权就地扣留。"\n\n她话音未落，药剂师公会的摩尔就笑了。\n\n"艾琳，你守了十二年，守出什么了？裂缝在那儿裂着，你堵得上吗？"\n\n"堵不堵得上，是我们守望者的事。"\n\n"那遗迹里的材料呢？"摩尔向前一步，声音拔高了，"雾根菇的药性已经变了，公会几十个药方都要重配。裂缝下面那些旧星庭的东西，能救多少人的命，你算过吗？"\n\n"能要多少人的命，我也算过。"\n\n两人隔着封锁线对峙，空气里火药味十足。\n\n商队头领卡恩站在人群后面，抱着手臂，笑而不语。他是半个月前带着三车货到苔桥村的，货单上写的都是"药材、矿石、旧器"。有人说他这半个月，一直在灰烬堡外围转悠。\n\n艾琳的目光扫过人群，最后落在你身上。\n\n"你是外人。"她说，"但这一夜你都在村里。苔桥村的事，你看见了。灰烬堡的事——你自己选。"\n\n人群让开了一条路。封锁线在晨光里泛着灰白的光，裂缝深处的暗紫色光芒，一明一暗，像在呼吸。',
condition:s=>s.region===5&&arcOf(s,M).flags['mist-saga-2']&&!arcSeen(s,M,'mist-s5'),
choices:[
{id:'a',label:'支持封锁',detail:'1日 · 交涉 · 声望',days:1,skill:'交涉',difficulty:8,fame:5,follow:'你站到艾琳身边，公开支持封锁。守望者们向你点头，摩尔冷笑一声，拂袖而去。\n"你做了个聪明决定。"艾琳低声说，随后又补了一句，"也是个危险的决定。守望者记你这份情，但公会的账，可没那么好算。"\n封锁线加高了一层。夜里，裂缝里的光暗了几分——像是感觉到这边多了几双盯着它的眼睛。',setFlags:['mist-k2-watcher'],arc:{phase:3,danger:-4,knowledge:3},npc:[{id:'mist-elin',trust:12,affinity:8}]},
{id:'b',label:'申请勘探许可',detail:'3日 · 5银 · 公会',days:3,cost:500,reward:300,skill:'交涉',difficulty:14,follow:'你走到摩尔面前，表示愿意与公会合作。摩尔眼珠一转，当场给你签了一张勘探许可——灰烬堡外围勘探，五日内有效。\n"拿着它，你就是公会的眼了。"他压低声音，"裂缝里有什么，我要知道第一手消息。"\n你拿着那张盖着药剂师公会火漆的羊皮纸，越过封锁线时，能感觉到艾琳的目光像钉子一样钉在你背上。',setFlags:['mist-k2-guild'],arc:{phase:3,knowledge:8},npc:[{id:'mist-moore',trust:8,interest:8}]},
{id:'c',label:'偷越封锁',detail:'2日 · 潜行考验 · 高风险 · 声望下降',days:2,skill:'潜行',difficulty:18,fame:-4,battle:'auto',follow:'你趁着暮色，从守望者巡逻的空隙摸进封锁线。灰烬堡的阴影里，两名巡逻的守望者挡住了去路——他们没有拔刀，只是静静地站在那里，像两棵长了根的老树。\n你赢了这场无声的对峙。守望者退开半步，放你过去，其中一人低声说了一句："裂缝边上，别碰那些根。"\n你越过了封锁线，站在灰烬堡墙根下那道裂缝前。暗紫色的光从缝隙里漫出来，照亮了墙上半枚被树根覆盖的旧星庭徽记——树根下面，似乎还压着什么更古老的东西。',setFlags:['mist-k2-rogue'],arc:{phase:3,knowledge:10,danger:8},failFollow:'守望者的短刀架住你的脖子时，你甚至没看清他们是怎么出现在背后的。\n"封锁令，不是摆设。"艾琳的声音从你身后传来，不带一丝温度。\n你被扣在苔桥村口的石柱上，蹲了整整一夜。第二天清晨，艾琳解开了你的绳子，只留下一句话："你要真想进那片林子，就堂堂正正地进。"\n灰烬堡的裂缝，暂时与你无关了。',failFlags:['mist-k2-caught']},
]},
{id:'mist-s6a',arcId:M,phase:3,volume:1,chapter:6,branch:'A',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'与艾琳同行',
premise:'封锁令下达后的第二天，艾琳·雾语带着你沿灰烬堡的封锁线巡查。\n\n她没有走大路，专挑林间的兽道。每走一段，她就停下来，蹲下捻捻泥土，看看树根的方向。\n\n"守望者守这片林子，不是怕那些蘑菇。"她在第三棵老橡树前停下，指着树根处一道极细的裂缝，"是怕这个。"\n\n裂缝里渗着暗紫色的光，细看，能看到光里有东西在流动，像活的。\n\n"十二年前，灰烬堡出事的时候，我还是个见习守望者。"艾琳说，"那晚下着暴雨，堡里的钟自己响了起来——响了十三下，然后整座堡的灯，全灭了。\n\n"第二天我们进去，什么都没找到。只有堡心的地面上，多了一道缝。\n\n"从那以后，雾根林的蘑菇开始变色。一年比一年紫，一年比一年近。"\n\n她站起身，望着灰烬堡的方向，声音很轻：\n\n"我师父说，那扇门底下，压着旧星庭的东西。压得住，就是苔桥村的太平；压不住……"\n\n她没有说完。\n\n你低头，看见脚下的树根正在缓缓移动——那速度不快，但确实在动，一寸一寸，朝着灰烬堡的方向。\n\n艾琳也看见了。她沉默了很久，最后说：\n\n"你帮我个忙。裂缝里的光，帮我盯着。它要是变了颜色——不是紫，是别的颜色——你第一时间告诉我。"',
condition:s=>arcOf(s,M).flags['mist-k2-watcher']&&!arcSeen(s,M,'mist-s6a'),
choices:[
{id:'a',label:'答应守望裂缝',detail:'2日 · 生存实践',days:2,skill:'生存',difficulty:8,follow:'接下来的两天，你每天沿封锁线走一圈，记下裂缝里光的颜色。第二天黄昏，你发现裂缝的光从暗紫变成了暗红——那红色只持续了一瞬，随即又变回紫色。\n你把这个发现告诉艾琳时，她握着刀柄的手关节发白。\n"红了……"她低声说，"师父说，十二年前那一夜，那道缝里的光，就是先变成红的。"',npc:[{id:'mist-elin',trust:14,affinity:6}],arc:{knowledge:8,danger:6},setFlags:['mist-s6-omen']},
{id:'b',label:'问艾琳旧星庭的事',detail:'1日 · 求知',days:1,follow:'你问起旧星庭。艾琳沉默了很久，从怀里掏出一块巴掌大的铁牌，上面刻着半枚被树根缠绕的徽记——和灰烬堡墙上那枚一模一样。\n"旧星庭的守门人铁牌。"她说，"我师父传给我的。传说旧星庭一共铸了十二块，每块守一扇门。灰烬堡这一扇，是第十三扇——多出来的那一扇。"\n她没再多说，把铁牌收了回去。但你注意到，铁牌背面刻着一行极小的字，你只来得及看清三个字："碎冠夜"。',arc:{knowledge:12},setFlags:['mist-s6-token']},
{id:'c',label:'提议深入裂缝查看',detail:'3日 · 高风险 · 战斗',days:3,skill:'结界',difficulty:20,battle:'auto',follow:'你提议趁封锁线刚立、裂缝还没完全闭合，下去看一眼。艾琳权衡良久，最终点头——她亲自带你下到裂缝口。\n裂缝底下是一条塌了半边的石廊，石壁上刻满了旧星庭的符文。你们走到尽头时，一头浑身缠着黑菌丝的腐木妖从石壁里挣了出来——它像是被压在地下的东西，终于等到了光。\n你把它斩在石廊里。艾琳看着地上那滩暗紫色的黏液，声音发紧：\n"这不是守卫。这是……这底下压着的东西，派出来探路的。"',failFollow:'石廊里的腐木妖比林子里那些凶悍得多。你拼力挡住它，让艾琳先退，自己却挨了重重一击，被拍在石壁上。等艾琳把你拖回地面时，你半边身子的骨头都在响。\n"你够胆。"艾琳把你交给苔丝，声音里带着怒意，"但下次别这么莽。"\n裂缝里的光，在你受伤的那个夜晚，变成了暗红色。',failFlags:['mist-s6-wound'],setFlags:['mist-s6-deep'],arc:{knowledge:15,danger:12}},
]},
{id:'mist-s6b',arcId:M,phase:3,volume:1,chapter:6,branch:'B',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'一纸许可',
premise:'勘探许可的羊皮纸还带着火漆的香气，你已经在灰烬堡外围走了整整两天。\n\n摩尔给的矿道图画得很细，红笔标到尽头的地方，正是那道裂缝的位置。你按图索骥，在裂缝北侧两百步的地方，发现了一处被灌木掩盖的旧井口。\n\n井口用铁栅封着，铁栅上挂着一把锈死的锁。锁头是旧星庭的式样——十字星纹，中间嵌着一枚已经发黑的宝石。\n\n你撬开铁栅，顺着井壁的脚窝爬下去。\n\n井底是一条人工凿出的通道，比矿道宽整得多，石壁上刻着成排的符文，每隔十步就有一盏已经熄灭的铜灯。你数了数，一共十三盏。\n\n通道尽头，是一扇半开的石门。\n\n门缝里漏出来的，不是暗紫色的光——是淡淡的、像月光一样的银白色。\n\n门后的石室里，整整齐齐码着几十口石箱。你打开最近的一口，里面是成捆的、用油布裹着的卷轴，卷轴上盖着旧星庭的印。\n\n你抽出最上面一卷，展开。\n\n那是一张名单——写着十二个名字，每个名字后面，都跟着一个地名。\n\n第一个名字后面，写着"灰烬堡"。\n\n你数了数，那些名字里，有一个你认识的：苔桥村，苔丝。\n\n你握着那卷名单的手，僵住了。',
condition:s=>arcOf(s,M).flags['mist-k2-guild']&&!arcSeen(s,M,'mist-s6b'),
choices:[
{id:'a',label:'带走名单',detail:'1日 · 收藏',days:1,follow:'你把那卷名单塞进怀里。离开石室前，你回头看了一眼那几十口石箱——它们静静躺在黑暗里，像一桩被埋了三百年的大秘密，等着被人重新记起。\n夜里，你借着油灯细看名单。十二个名字，十二个地名，每一个都在维尔兰的版图上：洛恩、卡斯蒂亚、北境、阿尔玛、圣辉、暮林……\n这份名单，串起的不是一个地方的故事。',arc:{knowledge:15},setFlags:['mist-s6-roster']},
{id:'b',label:'原样放回',detail:'1日 · 谨慎',days:1,follow:'你把名单放回原处，盖上油布，合上石箱。\n离开时你告诉自己：有些秘密，不该由你这种身份的人去翻。\n可那一夜，你翻来覆去睡不着。名单上"苔桥村，苔丝"那六个字，像一根刺，扎在你脑子里。苔丝只是个草药师，她为什么会出现在一份三百年前的名册上？',arc:{knowledge:8},setFlags:['mist-s6-leave']},
{id:'c',label:'去问摩尔',detail:'1日 · 交涉',days:1,skill:'交涉',difficulty:12,follow:'你拿着名单去找摩尔。他看完之后，脸上的笑彻底没了，盯着你看了很久。\n"这东西……"他压低声音，"你从哪儿弄来的？"\n你把井下的石室告诉了他。摩尔沉默良久，最后把名单折好塞进自己怀里：\n"这卷东西，就当没见过。你也不用再查了——灰烬堡的事，从现在起，是公会的事。"\n他补了一句，声音很低："十二个名字，十二扇门。碎冠夜那天丢的东西，不止王冠。"',npc:[{id:'mist-moore',interest:12,affinity:4}],arc:{knowledge:12},setFlags:['mist-s6-moore']},
]},
{id:'mist-s6c',arcId:M,phase:3,volume:1,chapter:6,branch:'C',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'灰枝的记号',
premise:'你越过了封锁线，但你没走远。\n\n灰烬堡墙根下，你蹲在裂缝边，借着暗紫色的光仔细看那些缠绕的树根。\n\n树根表面，有被刻过的痕迹。\n\n不是新刻的——刻痕发黑发旧，像在树皮上存在了很多年。你凑近了看，那是一个符号：一根树枝，弯成环状，环心里画着一只眼睛。\n\n"灰枝守望者的老记号。"\n\n声音从你身后传来。你猛地转身——一个披着灰斗篷的人不知何时站在三步之外，你竟一点动静都没听到。\n\n那人摘下兜帽，是个面色苍白的年轻人，眼睛很亮，像林子里那种夜里会反光的兽眼。\n\n"我盯了你两天了。"他说，"你翻封锁线的姿势，不像偷东西的，倒像是来找东西的。"\n\n"找什么？"\n\n"你问我？"他笑了笑，指了指裂缝，"我们灰枝守望者，分两派。一派守在外面，防人进去；一派守着这记号，等里面有人出来。我是后者。"\n\n他蹲下来，指尖拂过那枚树根上的眼睛记号：\n\n"这记号是十二年前刻的，刻它的人叫赫德，是我师父。他进裂缝那天起，再没出来。"\n\n他抬起头，看着你：\n\n"你要真想下去，我可以给你指条路——不是这条裂缝的路。是另一条，我师父留下的路。"',
condition:s=>arcOf(s,M).flags['mist-k2-rogue']&&!arcSeen(s,M,'mist-s6c'),
choices:[
{id:'a',label:'跟年轻人走',detail:'2日 · 潜行',days:2,skill:'潜行',difficulty:14,follow:'年轻人叫鸦，是灰枝守望者里被除名的那一派。他带你绕到灰烬堡东侧，拨开一片密不透风的灌木，露出一道半塌的暗门。\n"我师父十二年前在这道门里留了一盏灯，灯油够烧二十年。"他说，"现在应该还亮着。"\n门内是一条极窄的夹道，通往灰烬堡地下。夹道壁上，每隔一段就有一个用炭画的箭头，指向深处。\n你跟着鸦，走进了灰烬堡的心脏。',setFlags:['mist-s6-raven'],arc:{knowledge:12,danger:10},npc:[{id:'mist-elin',affinity:-2,trust:-4}]},
{id:'b',label:'先回村',detail:'1日 · 谨慎',days:1,follow:'你谢过鸦的提议，决定先回苔桥村把消息带回去。\n"随你。"鸦重新戴上兜帽，"不过——"他回头看了你一眼，"我师父说过，那扇门下面的东西，每隔十二年醒一次。上一次是碎冠夜，这一次……算算日子，快到了。"\n你回到村里，发现艾琳正在村口等你。她看着你翻封锁线留下的痕迹，只说了一句话：\n"裂缝里的光，今天下午变了颜色。"',setFlags:['mist-s6-report'],arc:{knowledge:6,danger:4}},
{id:'c',label:'追问碎冠夜',detail:'1日 · 求知',days:1,follow:'你问鸦，"碎冠夜"到底是什么。\n鸦沉默了很久，从怀里摸出一枚铁灰色的徽章——半枚被树根缠绕的星冠，和灰烬堡墙上那枚旧星庭徽记如出一辙。\n"碎冠夜，旧星庭塌了的那一夜。"他说，"王冠碎了，门开了，十二个守门人各奔东西。有人说他们死了，有人说他们带着钥匙藏起来了。\n"我只知道一件事——"他把徽章翻过来，背面刻着一行小字：\n"门会在第七个守门人回头之前，重新打开。"\n"今年，是第七个十二年的开头。"',arc:{knowledge:15},setFlags:['mist-s6-crown']},
]},
];
const mistSagaCards3:StoryCard[]=[
{id:'mist-s7',arcId:M,phase:3,volume:1,chapter:7,forkPoint:false,flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'林缘集结',
premise:'裂缝里的光，是在第三天黄昏变红的。\n\n那红色来得毫无征兆——先是暗紫，然后猛地一烫，整道缝像被烧红的铁条，亮得刺眼。\n\n守在封锁线外的两名守望者同时退了一步，手按在刀柄上，指节发白。\n\n紧接着，雾根林深处传来一声闷响，像什么沉重的东西从地下翻了个身。苔桥村的水井里，井水泛起一层油光，泛着腐甜的菌香。\n\n艾琳站在村口，望着灰烬堡方向，声音很平：\n\n"它醒了。"\n\n消息像风一样传开。\n\n药剂师公会的摩尔连夜赶到了苔桥村，身后跟着两辆装满药箱的马车。商队头领卡恩也来了，他带来的三车货卸了一半，剩下的货箱被他指挥着搬进村里最大的院子——箱子里装的不是货物，是一捆捆磨亮的兵器。\n\n苔桥村的村民被组织起来：妇女和孩子撤到村后的石屋里，青壮年领了兵器和火把，沿村界撒灰、堆柴、备水。\n\n苔丝把你拉到一边，塞给你一包药：\n\n"止血的、解瘀的、提神的，分三格。"她说，眼睛红红的，"你要是进那片林子——活着回来。"\n\n艾琳站在人群中央，声音不高，却压过了所有嘈杂：\n\n"灰烬堡下面的东西，今晚会醒。守，是守不住的。它要的是门——门开了，它就能出来。\n\n"所以今晚，不是守，是进去。在它完全醒过来之前，把门关上。"\n\n她说完，目光扫过人群，最后落在你身上。\n\n那目光里没有请求，只有一句话：\n\n"你，跟我走。"',condition:s=>s.region===5&&(arcOf(s,M).flags['mist-k2-watcher']||arcOf(s,M).flags['mist-k2-guild']||arcOf(s,M).flags['mist-k2-rogue'])&&!arcSeen(s,M,'mist-s7'),
choices:[
{id:'a',label:'挺身而出',detail:'1日 · 声望',days:1,skill:'交涉',difficulty:8,fame:6,follow:'你向前一步，站到艾琳身边。\n人群安静了一瞬，随即爆发出一阵低低的骚动——一个外人，在这时候站了出来。\n艾琳看了你一眼，没说什么，但你看到她握刀的手，松了一分。\n"好。"她说，"今晚，灰烬堡见。"',setFlags:['mist-saga-3'],arc:{phase:3,danger:-4,knowledge:3},npc:[{id:'mist-elin',trust:12,affinity:8}]},
{id:'b',label:'去帮苔丝配药',detail:'1日 · 医术',days:1,skill:'医术',difficulty:10,follow:'你没去凑热闹，转身进了药铺，帮苔丝把一筐筐草药分类、研磨、熬煮。\n"你倒沉得住气。"苔丝一边碾药一边说，声音里带着一丝不易察觉的欣慰，"打仗的人，总得有人备药。"\n黄昏时，你怀里揣着满满一包药，站在村口。艾琳走过你身边，丢下一句话：\n"药备好了？那走吧。"',setFlags:['mist-saga-3'],arc:{phase:3},npc:[{id:'mist-tess',trust:10,affinity:8}]},
{id:'c',label:'整备武器',detail:'1日 · 铁匠',days:1,skill:'铁匠',difficulty:10,follow:'你找到卡恩，从那堆兵器里挑了一把趁手的，又借了村里的磨刀石，把刃口磨得能照出人影。\n卡恩靠在门框上看着你，慢悠悠地说："你这架势，不像是去送死的。"\n"本来就不是。"\n"那就好。"他笑了一下，声音压低了些，"灰烬堡里要是有个铁盒子——巴掌大，锈的，别碰，带回来给我。价钱好说。"\n你记住了这句话。',setFlags:['mist-saga-3'],arc:{phase:3},npc:[{id:'mist-kahn',interest:10}]},
]},
{id:'mist-s8',arcId:M,phase:3,volume:1,chapter:8,forkPoint:true,flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'谁与你同行',
premise:'入夜，灰烬堡的残影在雾里若隐若现。\n\n钟声从堡里传出来——不是敲响的钟声，是那种"嗡"的一声，像有什么重物撞在钟壁上，震得整座残堡都在响。\n\n十三下。和艾琳说的一模一样。\n\n封锁线外，火把排成一条长龙。守望者、公会的伙计、苔桥村的青壮年，还有你。\n\n艾琳站在最前面，把守门人铁牌挂在胸前，转过身，看着身后这群人。\n\n"进堡的路只有一条，就是从裂缝下去。下去之后，生死各凭本事。"她的声音很稳，"现在，想退的，还来得及。"\n\n没有人动。\n\n艾琳的目光落在你身上，又越过你，落在摩尔、卡恩身上。\n\n"这一趟，不是谁人多谁就赢。"她说，"下面那道门，需要有人去关。门关上之前，得有人挡住从门里出来的东西。\n\n"所以要有人跟我走前面，也要有人看后面。"\n\n夜风裹着腐甜的菌香灌过来。灰烬堡的钟，又响了一下。\n\n艾琳开口，声音在夜雾里显得格外清晰：\n\n"——你，跟谁走？"',
condition:s=>s.region===5&&arcOf(s,M).flags['mist-saga-3']&&!arcSeen(s,M,'mist-s8'),
choices:[
{id:'a',label:'与艾琳同行',detail:'守望者 · 正面对抗',days:1,follow:'你走向艾琳。她什么都没说，只把守门人铁牌在你面前晃了一下，示意你跟紧。\n"下去之后，别离我三步远。"她低声说，"缝里的东西，认牌，不认人。"',setFlags:['mist-k3-elin'],arc:{phase:3,danger:-6,knowledge:4},npc:[{id:'mist-elin',trust:14,affinity:10}]},
{id:'b',label:'与摩尔同行',detail:'公会 · 遗迹研究',days:1,follow:'你走向摩尔的队伍。他愣了一下，随即露出一个"你识货"的笑。\n"聪明。"他压低声音，"艾琳那种人，刀快，但脑子死。你跟我走，底下那些旧星庭的玩意儿，我分你一半。"',setFlags:['mist-k3-moore'],arc:{phase:3,knowledge:8},npc:[{id:'mist-moore',interest:12,trust:6}]},
{id:'c',label:'与卡恩同行',detail:'商队 · 浑水摸鱼',days:1,follow:'你走向卡恩。他正低头往怀里塞一把短弩，看见你过来，挑了挑眉。\n"有意思。"他说，"一个外人，不跟守望者走，也不跟公会走，跟着我个商人。"\n他拍了拍你的肩："识货。走吧——记住，底下要是有铁盒子，带回来给我。"',setFlags:['mist-k3-kahn'],arc:{phase:3,knowledge:6},npc:[{id:'mist-kahn',interest:12,trust:8}]},
{id:'d',label:'独自行动',detail:'独行 · 隐秘',days:1,follow:'你没有走向任何人。\n艾琳看了你一眼，没拦；摩尔耸耸肩；卡恩吹了声口哨。\n独行的人，在灰烬堡这种地方，往往活不到天亮——但也往往，能看见别人看不见的东西。\n你摸了摸怀里的武器，走向裂缝。',setFlags:['mist-k3-alone'],arc:{phase:3,danger:6,knowledge:6}},
]},
{id:'mist-s9a',arcId:M,phase:3,volume:1,chapter:9,branch:'A',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'守望者的刀',
premise:'裂缝比白天看到的更深。\n\n艾琳打头，你跟在三步之内。火把的光在石壁上跳动，把那些旧星庭的符文照得忽明忽暗。\n\n沿着裂缝下行约百步，石壁豁然开朗——你们脚下是一片巨大的地下广场，穹顶高得看不见，四周立着十二根石柱，柱身上缠绕着已经石化的树根。\n\n广场正中，是一座石台。\n\n石台上空无一物，只有一圈焦黑的痕迹，像一个圆环。\n\n艾琳在石台前站住，把守门人铁牌举到火把光下。\n\n"十二根柱子，十二个守门人。"她说，"旧星庭立这十二根柱子的时候，每一根都守着一扇门。灰烬堡是第十三扇——不在十二根柱子里，所以没人守，最后塌了。"\n\n"那这第十三扇门，到底压着什么？"你问。\n\n艾琳沉默了很久。\n\n"旧星庭最后一位大法师，叫凡赫姆。"她说，"传说他临终前，把一样东西封在灰烬堡下。那东西不是宝物，也不是武器——是一个名字。\n\n"他留下的遗言是：只要那个名字不被念出来，门就不会开。"\n\n"今晚它醒了，是因为……有人念了那个名字。"\n\n她转过身，火把的光照着她的脸，明暗不定：\n\n"念名字的人，就在这附近。"\n\n话音刚落，广场深处传来一声极轻的、像叹息一样的声音。\n\n艾琳握紧了刀。',
condition:s=>arcOf(s,M).flags['mist-k3-elin']&&!arcSeen(s,M,'mist-s9a'),
choices:[
{id:'a',label:'随艾琳逼近声源',detail:'2日 · 潜行 · 高风险',days:2,skill:'潜行',difficulty:18,follow:'你们循着叹息声摸进广场深处的回廊。回廊尽头，一扇半开的石门后，蹲着一团黑影——那不是活物，是一具穿着旧星庭长袍的骸骨，跪在石台前，双手前伸，像在祈祷，又像在祈求宽恕。\n骸骨面前的地面上，刻着一行字。\n艾琳凑近看了很久，脸色第一次变了。\n"这不是凡赫姆的字。"她说，"这是后来的人刻的。"\n那行字是：\n"第七个十二年，第七个守门人回头，门开。"',arc:{knowledge:15,danger:6},setFlags:['mist-s9-skeleton'],npc:[{id:'mist-elin',trust:8}]},
{id:'b',label:'检查石台焦痕',detail:'1日 · 学识',days:1,skill:'学识',difficulty:14,follow:'你蹲在石台边，细看那圈焦痕。焦痕不是火烧的——是一种极细密的纹路，像无数根须盘绕留下的印迹。\n你伸出手指，沿着纹路描摹，发现它们组成了一幅图：一棵树，树冠朝上，树根朝下，树根尽头画着一扇门。\n门的旁边，刻着两个字母：\n"H·V"\n艾琳看了一眼，说："凡赫姆。他姓V。"\n但那两个字母的笔迹，和刚才骸骨面前那行字，一模一样。',arc:{knowledge:12},setFlags:['mist-s9-char']},
{id:'c',label:'问艾琳十三扇门',detail:'1日 · 求知',days:1,follow:'你问艾琳，十三扇门到底是什么。\n"旧星庭的地基，据说压在十三条地脉的交叉点上。"艾琳说，"每一扇门，都开在一条地脉上。十二扇门是十二位守门人看着的，第十三扇——没有守门人，所以它一开，其他十二扇，也会跟着松。"\n她顿了顿：\n"所以我师父才说，灰烬堡这道缝，不能让它开大。它开大，整个维尔兰的地脉，都会跟着醒。"',arc:{knowledge:10},setFlags:['mist-s9-arcana']},
]},
{id:'mist-s9b',arcId:M,phase:3,volume:1,chapter:9,branch:'B',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'学者的书',
premise:'摩尔下裂缝的速度比你想的快。\n\n他像是早就知道路，带着你绕过裂缝的陡段，从侧面一条被塌方掩盖的旧甬道钻了进去。\n\n甬道尽头是一间石室，比外面干净得多——石壁上没有符文，只有一排排嵌入墙体的石架，架上摆满了卷轴和书册。\n\n"公会等这一趟，等了三十年。"摩尔点起一盏铜灯，眯着眼扫过那些卷轴，像守财奴看见了金山，"三十年前，公会的老师傅们就在灰烬堡外围发现过旧星庭的文书残页。他们断定，这座堡底下，埋着旧星庭的图书馆。"\n\n他从架上抽出一卷，吹掉灰，展开。\n\n纸上是一种古老的花体字，你认不全，但能认出其中反复出现的两个词——\n\n"门"，以及，"碎冠夜"。\n\n"碎冠夜"这个词，你这一路已经听了几次。\n\n摩尔注意到你的目光，笑了笑，把那卷纸递到你面前：\n\n"想学？这些书里，有你想知道的一切。只要你帮我把它们搬出去。"\n\n石室深处，忽然传来一声轻微的"咔嗒"声，像什么机关被触动了。\n\n摩尔的脸，一瞬间没了血色。',
condition:s=>arcOf(s,M).flags['mist-k3-moore']&&!arcSeen(s,M,'mist-s9b'),
choices:[
{id:'a',label:'翻看碎冠夜记载',detail:'2日 · 学识',days:2,skill:'学识',difficulty:16,follow:'你在卷轴堆里翻了半夜，终于找到一卷封皮被虫蛀了大半的册子。\n上面记载着：碎冠夜，旧星庭末代大法师凡赫姆，将一件"不该存在之物"封于灰烬堡下。那物不是武器，而是一个名字——凡赫姆在生命的最后时刻，将那个名字"缝"进了一扇门里。\n册子最后一页，画着一幅图：十二根柱子的广场，正中一道圆环。圆环中央，画着一颗没有叶子的树。\n树根下，压着一行字：\n"念出名字者，开其门；守住名字者，闭其门。"',arc:{knowledge:18},setFlags:['mist-s9-name']},
{id:'b',label:'查那声咔嗒',detail:'1日 · 潜行 · 高风险',days:1,skill:'潜行',difficulty:16,follow:'你循着咔嗒声摸到石室北墙。墙面上有一块砖松动了，你小心地把它抽出来——砖后面的空洞里，躺着一枚巴掌大的铁牌，锈得几乎看不清图案。\n你吹掉锈屑，看清了铁牌上的纹路：一根树枝弯成环，环心一只眼睛。\n灰枝守望者的记号。\n这间石室，守望者来过。',arc:{knowledge:10,danger:4},setFlags:['mist-s9-badge']},
{id:'c',label:'劝摩尔先撤',detail:'1日 · 交涉',days:1,skill:'交涉',difficulty:12,follow:'你按住摩尔的肩膀："这地方不对劲。书不会跑，命会。"\n摩尔盯着你看了两秒，最后咬牙把已经卷起的轴册塞回架子上："你最好值这个价。"\n你们退到甬道口时，石室里传来一阵细密的、像树根爬过石面的沙沙声。摩尔的后背，瞬间被冷汗浸透了。',npc:[{id:'mist-moore',trust:8,interest:4}],arc:{danger:-4},setFlags:['mist-s9-back']},
]},
{id:'mist-s9c',arcId:M,phase:3,volume:1,chapter:9,branch:'C',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'商人的算盘',
premise:'卡恩下裂缝的路，是另一条。\n\n他绕开所有人，带着你从灰烬堡北侧一处被藤蔓盖住的排水口钻了进去。\n\n排水口里积着半尺深的黑水，他走得毫不犹豫，像走过一百遍。\n\n"你干这行的，多少年没来过这儿了？"你忍不住问。\n\n卡恩停了一下，没回头：\n\n"这话该我问你。"他说，"不过既然你问了——我从没来过。但我师父来过。"\n\n"你师父？"\n\n"我师父是个盗墓的。"他说得坦然，"三十年前，他摸进灰烬堡，打算捞点旧星庭的陪葬品。结果他空着手出来，只带了一句话。"\n\n"什么话？"\n\n"他说，灰烬堡下面那扇门，别碰。碰了，整个暮林的雾，都得跟着变。"\n\n卡恩在一扇铁门前停住，掏出钥匙串，熟练地挑出一把，插进锁孔。\n\n"我师父最后死在外头，没死在灰烬堡。"他拧动钥匙，声音低了下去，"他说他是被吓死的。他说他看见过那扇门开了一条缝——就那么一条缝——看见缝里的东西，他这辈子再没敢碰任何坟。"\n\n铁门"咔哒"一声开了。\n\n门后，是一条向下的长阶，尽头浮着一点暗紫色的光。\n\n"走吧。"卡恩深吸一口气，"看看我师父当年不敢看的东西。"',
condition:s=>arcOf(s,M).flags['mist-k3-kahn']&&!arcSeen(s,M,'mist-s9c'),
choices:[
{id:'a',label:'随卡恩下长阶',detail:'2日 · 潜行 · 高风险',days:2,skill:'潜行',difficulty:18,follow:'长阶尽头是一间圆形石室，四壁刻满符文，地面中央嵌着一枚巴掌大的铁环——环上缠着锈死的树根。\n卡恩蹲下来，盯着那枚铁环看了很久。\n"这就是我师父说的门。"他说，"不是门，是锁。"\n他伸手想碰那铁环，被你一把拦住。\n"你说过，碰了，整个暮林的雾都得跟着变。"\n卡恩的手停在半空，最后收了回去。\n"你说得对。"他站起来，擦了把冷汗，"走吧，这趟就当是来认路的。"\n他临走前，把那枚铁环的形状，一笔一划画在纸上，揣进怀里。',arc:{knowledge:14,danger:8},setFlags:['mist-s9-lock']},
{id:'b',label:'追问钥匙',detail:'1日 · 交涉',days:1,skill:'交涉',difficulty:14,follow:'你问卡恩，那扇门要怎么开。\n"开锁得有钥匙。"卡恩说，"我师父找了一辈子钥匙，最后说他找到了——又说他宁可没找到。"\n"为什么？"\n"因为那把钥匙……"卡恩压低声音，"不是物件，是个人。"\n他指了指地面：\n"旧星庭铸了十二块守门人铁牌。传说是十二个守门人各执一块。可灰烬堡是第十三扇门，没有第十三块牌。\n"所以凡赫姆把钥匙做成了人——一个生来就带着那扇门的血脉的人。"\n他抬起头，火光映着他的脸：\n"十二年了，我一直在找那个人。"',arc:{knowledge:16},setFlags:['mist-s9-key']},
{id:'c',label:'直接折返',detail:'1日 · 谨慎',days:1,follow:'你看着那道暗紫色的光，决定到此为止。\n"书里写的好汉，死在故事里；现实里的好汉，死在好奇里。"你对卡恩说。\n卡恩愣了一下，随即笑了："行，这话值一顿酒。"\n你们原路退回。但那一夜，你在苔桥村的客栈里翻来覆去，那道暗紫色的光，始终在你眼前晃。',setFlags:['mist-s9-back'],arc:{danger:-4,knowledge:4}},
]},
{id:'mist-s9d',arcId:M,phase:3,volume:1,chapter:9,branch:'D',flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'独行者的影',
premise:'独行的人，在灰烬堡这种地方，看见的东西和别人不一样。\n\n别人看见的是路，你看见的是脚印。\n\n裂缝底部，火把的光照出石面上的尘土——尘土上有几行新鲜的脚印，很浅，像有人在你之前下去过，又小心地把脚印抹了一半。\n\n你蹲下来，借光看那脚印的走向。\n\n它们没有往广场深处去，而是拐向侧面一条几乎被树根封死的窄缝。\n\n你拨开树根，侧身挤了进去。\n\n窄缝尽头，你看见一个人。\n\n那人背对着你，蹲在一面石壁前，正用指尖在壁面上描着什么。他听见你的脚步声，没有回头，只是开口说：\n\n"你终于来了。"\n\n声音很年轻，带着一种奇怪的笃定。\n\n"你是谁？"你问。\n\n"我？"那人缓缓转过身，火光映出一张苍白的脸——是鸦，那个在封锁线外指给你看灰枝记号的年轻人。\n\n他笑了笑，那笑容在暗紫色的光里显得有些古怪：\n\n"我是等门开的人。你呢——你是来关门的，还是来开门的？"',
condition:s=>arcOf(s,M).flags['mist-k3-alone']&&!arcSeen(s,M,'mist-s9d'),
choices:[
{id:'a',label:'问鸦等的是什么',detail:'1日 · 求知',days:1,follow:'"等门开的人，为什么要等门开？"你问。\n鸦的笑容淡了下去。\n"因为门里有我师父。"他说，"赫德，十二年前下去的守门人，我师父。他进去那天，留下话说：门开的时候，他会在门里等我。"\n"你信？"\n"我信。"他转过头，目光落在石壁上那幅被描了一半的图上——一棵树，树根盘绕，树根尽头一扇门，"因为十二年前他进去那天，也是我出生的那天。"\n石壁上的图，树根下写着两个字：\n"赫德"。',arc:{knowledge:14},setFlags:['mist-s9-herd']},
{id:'b',label:'追问碎冠夜钥匙',detail:'1日 · 求知',days:1,follow:'你问鸦，"钥匙是人"是什么意思。\n鸦沉默了很久，指尖在石壁上缓缓划过。\n"旧星庭的十二块守门人铁牌，传说是钥匙。"他说，"可凡赫姆留的是第十三扇门，没有第十三块牌。\n"所以他把钥匙做成了人——一个流着那扇门血脉的人。门认血，不认牌。"\n他忽然笑了，笑里有一丝说不清的东西：\n"十二年前，赫德进门的那个晚上，凡赫姆的血脉在这世上多了一个人。"\n"那个人——"\n"就是我。"鸦说。',arc:{knowledge:18},setFlags:['mist-s9-blood']},
{id:'c',label:'拔刀对峙',detail:'1日 · 战斗',days:1,skill:'剑术',difficulty:16,follow:'你没有答话，手按上刀柄。\n鸦看着你的动作，慢慢举起双手，退了一步。\n"别紧张。"他说，"我不是来杀你的。我要是想杀你，你进这道窄缝之前，就已经死了。"\n他放下手，指向石壁深处："门在那边。你要是去关门——我不拦你。我只想看一眼，门开的时候，我师父在不在里面。"\n他的声音很轻，却像一根针，扎进你心里。',setFlags:['mist-s9-stand'],arc:{danger:-4,knowledge:8}},
]},
{id:'mist-s10',arcId:M,phase:4,volume:1,chapter:10,forkPoint:false,flags:[],kindName:'史诗 · 暮林卷Ⅰ · 雾起苔桥',title:'走向灰烬堡',
premise:'钟声响到第十三下的时候，灰烬堡下的大地震动了。\n\n你们所有人都看见了那一幕——\n\n广场中央的石台，从中间裂开。\n\n裂缝里涌出来的不是暗紫色的光，是黑色的雾。黑雾浓得化不开，贴着地面蔓延，所过之处，石壁上的符文一片片熄灭。\n\n艾琳拔刀。摩尔把卷轴塞进怀里。卡恩握紧了短弩。\n\n黑雾深处，传来一声低沉的、像树根断裂又像骨头摩擦的声音。\n\n然后，一双眼睛在雾里亮了起来。\n\n那双眼睛是暗紫色的，没有瞳仁，像两团燃烧的雾火。\n\n那东西从裂缝里挣出来——它不是怪物，它是一棵树。\n\n一棵长着人脸的树。\n\n树冠上垂着无数根须，根须末端滴着暗紫色的黏液。树身中央，那张苍白的脸上，五官像被水泡过，模糊而扭曲。\n\n"凡赫姆……"艾琳的声音从牙缝里挤出来，"他把自己种在了门里。"\n\n"碎冠夜他根本没死——他把自己的名字，缝进了这棵树里！"\n\n那棵树缓缓转动着那张脸，浑浊的目光扫过众人，最终停在你身上。\n\n黑雾里，无数根须朝你涌来。\n\n艾琳挡在你面前，刀锋在火光里划出一道亮线：\n\n"关门！你去找那扇门，我们挡住它！"\n\n根须如潮水般扑来。\n\n灰烬堡的钟，在雾里敲出了第十四下。',
condition:s=>s.region===5&&(arcOf(s,M).flags['mist-k3-elin']||arcOf(s,M).flags['mist-k3-moore']||arcOf(s,M).flags['mist-k3-kahn']||arcOf(s,M).flags['mist-k3-alone'])&&!arcSeen(s,M,'mist-s10'),
choices:[
{id:'a',label:'迎战雾中之树',detail:'3日 · 决战 · 战斗',days:3,skill:'剑术',difficulty:30,battle:'auto',follow:'你挥刀斩断扑来的根须，一路杀向那棵树。刀锋砍在树身上，溅起暗紫色的汁液——树身颤抖了一下，那张苍白的脸发出第一声惨叫，声音竟像人声。\n你抓住树身中央那张脸，把刀狠狠捅了进去。\n"凡赫姆！"你吼出那个名字，"你种了三百年的树，今天该倒了！"\n树身轰然裂开，黑雾倒灌。门——那扇被树根缠绕的门，在树倒下的瞬间，露了出来。',failFollow:'树根比刀更快。你被一根粗如手臂的根须缠住脚踝，拖进黑雾深处。艾琳拼死把你拽出来时，你半边身子的衣服都成了布条，胸口留下一道深可见骨的爪痕。\n"退！"艾琳嘶吼着，带着你撤出广场。\n灰烬堡的钟，在你们身后敲出了第十五下。\n门没有关上。雾根林的雾，比任何时候都浓。',failFlags:['mist-s10-fail'],setFlags:['mist-saga-vol1'],arc:{phase:4,knowledge:6}},
{id:'b',label:'布阵迎敌',detail:'3日 · 结界 · 群体',days:3,skill:'结界',difficulty:24,follow:'你没有冲上去，而是退到石柱后，借火把和圣盐灰，在脚下画出一道结界纹路。\n"都进来！"你喊。\n守望者和公会的伙计们退进结界，灰白色的光从地面亮起，黑雾撞在结界边缘，像撞上无形的墙，发出滋滋的声响。\n那棵树扑不进来，根须在结界外疯狂地拍打。\n"现在！"你冲着艾琳喊，"关门！"\n艾琳趁机绕过树身，冲向那扇门——铁牌在她掌心发亮，门上的树根像被烧灼一般纷纷退开。\n门，缓缓合拢。',setFlags:['mist-saga-vol1'],arc:{phase:4,knowledge:8},npc:[{id:'mist-elin',trust:10,affinity:6}]},
{id:'c',label:'引它出堡',detail:'3日 · 战术 · 高风险',days:3,skill:'战术',difficulty:26,follow:'"别在堡里打！"你抄起火把，冲向裂缝出口，"它怕光！引它出去！"\n根须追着你冲出裂缝。黎明前的雾气里，你带着那棵树穿过封锁线，一路奔向雾根林边缘——那里，守望者们堆着成垛的干柴。\n火把掷进柴堆，烈焰冲天。\n那棵树在火光里发出震耳欲聋的嘶鸣，树身一寸寸焦黑、龟裂。\n等火熄灭时，灰烬里只剩一截焦黑的树桩，树桩中央，嵌着一枚暗紫色的、像心脏一样跳动的结晶。\n艾琳走上前，用刀背把那枚结晶撬了下来，看了很久，只说了一句：\n"凡赫姆，种了三百年的东西……终究还是留了个根。"',setFlags:['mist-saga-vol1'],arc:{phase:4,knowledge:10},npc:[{id:'mist-elin',trust:8}]},
]},
];
export const storyCards:StoryCard[] = [
  ...mistSagaCards,
// ---------- 卡1 · 雾根蘑菇失色（起点） ----------
{
  id:'mist-door-1',arcId:M,phase:1,
  title:'雾根蘑菇失色',
  premise:`苔桥村的市集日，药草摊上堆着成捆的雾根蘑菇——灰绿色的伞盖本该带着露水的药香，可摊主面前的几筐，颜色发灰，闻起来只有土腥气。

草药师苔丝蹲在摊前，捡起一朵放在鼻尖，眉头越皱越紧。"失色了。"她说，"雾根蘑菇只在深林的菌脉上失色。那片林子，谁进去谁出事。"

你顺着她目光望去，村口那条通往灰烬堡的旧道，林影沉沉的。守林长艾琳·雾语恰好从集市边走过，她听见了苔丝的话，脚步顿了一下，却什么也没说，只是把目光投向灰烬堡方向。`,
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-1')&&arcOf(s,M).phase===0,
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-2')&&arcOf(s,M).phase===1&&(hasArcFlag(s,M,'mist-clue')||hasArcFlag(s,M,'mist-clue-guild')||hasArcFlag(s,M,'mist-blind')),
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-3')&&arcOf(s,M).phase>=2&&(hasArcFlag(s,M,'mist-entrance')||hasArcFlag(s,M,'mist-secret-path')),
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-4')&&arcOf(s,M).phase>=2&&(hasArcFlag(s,M,'mist-side-watcher')||hasArcFlag(s,M,'mist-side-guild')||hasArcFlag(s,M,'mist-side-rogue')),
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-5')&&arcOf(s,M).phase>=3&&(hasArcFlag(s,M,'mist-party-watcher')||hasArcFlag(s,M,'mist-party-scholar')||hasArcFlag(s,M,'mist-party-guild')||hasArcFlag(s,M,'mist-party-alone')),
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-6')&&arcOf(s,M).phase>=4&&(hasArcFlag(s,M,'mist-sealed')||hasArcFlag(s,M,'mist-core')||hasArcFlag(s,M,'mist-recorded')),
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-7')&&arcOf(s,M).phase>=4&&(hasArcFlag(s,M,'mist-artifact-holy')||hasArcFlag(s,M,'mist-artifact-guild')||hasArcFlag(s,M,'mist-artifact-watcher')||hasArcFlag(s,M,'mist-artifact-hidden')),
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
  condition:s=>false /* 旧链已由 saga 卷Ⅰ(mist-s1..s10) 接管 */&&!seen(s,'mist-door-8')&&arcOf(s,M).phase>=5&&(hasArcFlag(s,M,'mist-rescue')||hasArcFlag(s,M,'mist-protect')||hasArcFlag(s,M,'mist-exploit')),
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
// ============================================================
// 洛恩王国 · 河谷税册 —— 第二阶段（§3.1 对抗/抉择/余波）
// ============================================================
{ // 卡3 · 对抗：行会与贵族对质
  id:'loen-tax-3',arcId:LO,phase:3,
  title:'对质之夜',
  premise:`封仓的第十一天，灰河镇炸了锅。贝拉带着行会账房堵在镇公所门口，当着全街的人，把税册上多算的亩数和粮价上涨的账目拍在桌上；囤粮的贵族洛伦老爷则让管家抬来三箱"捐赠"银币，笑吟吟地说是"给镇子的心意"。

赫尔曼被夹在中间，来回擦汗。有人喊"查账"，有人喊"捐粮"，更多的人沉默地看着你——这半年来，你既替邻里算过账，也进过粮仓，如今两边都想拉你作证。

镇公所的门，在夜里十一点被反锁。天亮前，必须有个说法。`,
  condition:s=>inLoen(s)&&!seenL(s,'loen-tax-3')&&arcOf(s,LO).phase>=2&&(arcOf(s,LO).flags['loen-ledger']||arcOf(s,LO).flags['loen-help']||arcOf(s,LO).flags['loen-smuggle']),
  deadline:{key:'loen-blame',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('对质拖成械斗，行会与贵族各伤数人，灰河镇彻底撕裂');
    a.tension=Math.min(100,a.tension+10);a.danger=Math.min(100,a.danger+6);
    const ws=s.worldStory;if(ws&&ws.npcs['loen-bella']){ws.npcs['loen-bella'].trust=Math.max(0,ws.npcs['loen-bella'].trust-6);ch.push('贝拉信任 −6 —— 她在等一个站出来的盟友');}
    return ch;
  }},
  choices:[
    {id:'a',label:'帮行会公开证据',detail:'3日 · 识字/礼仪考验 · 声望',days:3,skill:'识字',difficulty:22,reward:250,fame:8,follow:'你连夜把税册与粮账逐项比对，当着全镇把洛伦老爷名下多占的田亩念了出来。人群炸了又静。贝拉握住你的手："这镇子以后记得你今天。"',npc:[{id:'loen-bella',trust:12,affinity:8}],arc:{tension:-10,knowledge:12,phase:3},setFlags:['loen-side-guild'],flag:'story:loen-tax-3'},
    {id:'b',label:'替贵族压场',detail:'2日 · 3银 · 礼仪 · 声望下降',days:2,cost:300,reward:400,fame:-6,follow:'你出面劝散了行会的账房，替洛伦老爷的"捐赠"说了几句好话。当晚赫尔曼在酒馆角落请你喝了一杯，压低声音："你救了体面，可镇子心里有杆秤。"',npc:[{id:'loen-hermann',trust:8},{id:'loen-bella',affinity:-10}],arc:{tension:6,phase:3},setFlags:['loen-side-noble'],flag:'story:loen-tax-3'},
    {id:'c',label:'独立查囤粮真相',detail:'4日 · 潜行/占卜考验 · 高风险',days:4,skill:'潜行',difficulty:28,reward:500,follow:'你趁夜潜入洛伦的私仓，翻出三年前"战时粮税"的往来账目——那上面的签名，一直通到王都税署。你把账本交给贝拉，也抄了一份留给赛门。',npc:[{id:'loen-simon',trust:10},{id:'loen-bella',trust:6}],arc:{knowledge:20,danger:8,phase:3},setFlags:['loen-side-truth'],flag:'story:loen-tax-3'},
  ],
  flags:['loen-side-guild','loen-side-noble','loen-side-truth'],
},
{ // 卡4 · 抉择：征粮令与饥荒风险并至
  id:'loen-tax-4',arcId:LO,phase:4,
  title:'征粮令',
  premise:`王都的征粮令在入冬前送达：灰河镇须在三日内上缴一千石粮食，违者按"通敌"论处。可镇上的存粮，即使算上洛伦老爷那三箱"捐赠"，也只够全镇吃到明年开春。

税吏赛门看完告示，脸色惨白——他比谁都清楚，这笔粮交上去，明年春天灰河镇要饿死人；不交，王都的铁骑就要踏进来。

粮仓的钥匙，如今在赫尔曼手里。他把它放在桌上，推到你面前："你来定。开了仓，是罪；不开，是饿。镇子的命，你挑一头。"`,
  condition:s=>inLoen(s)&&!seenL(s,'loen-tax-4')&&arcOf(s,LO).phase>=3&&(arcOf(s,LO).flags['loen-side-guild']||arcOf(s,LO).flags['loen-side-noble']||arcOf(s,LO).flags['loen-side-truth']),
  deadline:{key:'loen-famine',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('征粮令如期执行，灰河镇开春断粮，逃荒者涌向邻镇');
    a.scarcity=Math.min(100,a.scarcity+15);a.tension=Math.min(100,a.tension+8);
    const ws=s.worldStory;if(ws&&ws.npcs['loen-hermann']){ws.npcs['loen-hermann'].trust=Math.max(0,ws.npcs['loen-hermann'].trust-8);ch.push('赫尔曼镇长信任 −8 —— 他被迫亲手封了仓');}
    return ch;
  }},
  choices:[
    {id:'a',label:'开仓放粮',detail:'2日 · 声望大涨 · 现金损失',days:2,fame:12,follow:'你当着全镇的面打开粮仓，宣布先济孤寡、再平市价。赫尔曼脸色惨白地看你，最终却也跟着搬起粮袋。三天后，征粮的骑队只拉走了半仓谷子——和一张全镇联名的陈情书。',npc:[{id:'loen-hermann',trust:10,affinity:8},{id:'loen-bella',trust:8}],arc:{scarcity:-14,tension:-8,phase:4},setFlags:['loen-open'],flag:'story:loen-tax-4'},
    {id:'b',label:'贩运私粮获利',detail:'3日 · 10银 · 贸易 · 高风险',days:3,cost:1000,reward:1800,follow:'你连夜从邻镇贩来私粮补足官差，两头赚了差价。赫尔曼看着账本沉默良久："你救了镇子，也肥了自己。这笔账，镇子会记着。"',npc:[{id:'loen-bella',interest:8,affinity:-6}],arc:{tension:10,danger:8,phase:4},setFlags:['loen-trade'],flag:'story:loen-tax-4'},
    {id:'c',label:'组织全镇互助',detail:'3日 · 礼仪/指挥考验 · 声望',days:3,skill:'礼仪',difficulty:22,reward:200,fame:10,follow:'你把全镇人按坊编队，富户出粮、壮丁出工、猎户进山，赶在限期前凑出六百石，附上灾情陈情。赛门替你把文书转呈王都，回来时眼圈泛红："税署头一回批了减征。"',npc:[{id:'loen-simon',trust:12},{id:'loen-hermann',trust:6}],arc:{scarcity:-8,tension:-6,phase:4},setFlags:['loen-mutual'],flag:'story:loen-tax-4'},
  ],
  flags:['loen-open','loen-trade','loen-mutual'],
},
{ // 卡5 · 余波：灰河的新册
  id:'loen-tax-5',arcId:LO,phase:5,
  title:'灰河的新册',
  premise:`征粮的风波过去，灰河镇迎来了一个安静的冬天。粮价回落，失地的佃户陆续赎回田地，新税册在春天重印——这一版，是按你核算过的真实田亩写的。

尘埃落定那天，赫尔曼把一份盖着镇印的文书放在你面前：是"协理镇务"的聘书，也是灰河镇对你这几年的交代。而你在整理旧账时，从税署退回的卷宗里，夹出一页泛黄的纸——上面记着旧星庭时代的税目，和一条通往王都地下的"密道"字样。这页纸，或许比税册更重要。`,
  condition:s=>inLoen(s)&&!seenL(s,'loen-tax-5')&&arcOf(s,LO).phase>=4&&(arcOf(s,LO).flags['loen-open']||arcOf(s,LO).flags['loen-trade']||arcOf(s,LO).flags['loen-mutual']),
  choices:[
    {id:'a',label:'支持地方自治',detail:'1日 · 声望大涨',days:1,fame:12,follow:'你支持贝拉牵头重编镇规，把税册、粮仓与赈济都写进自治章程。灰河镇从此自收自支，王都的税吏再来，要拿着新册子说话。',npc:[{id:'loen-bella',trust:10,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'灰河行会'},setFlags:['loen-autonomy','crown-clue-loen'],flag:'story:loen-tax-5'},
    {id:'b',label:'拥护王都税制',detail:'1日 · 赛门信任',days:1,follow:'你把新税册连同镇情上报王都，为减征争取到正式批文。赛门临走前郑重道谢，并留下一句承诺："往后灰河镇的文书，我亲自过目。"',npc:[{id:'loen-simon',trust:12,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'王室税署'},setFlags:['loen-crown-loyal','crown-clue-loen'],flag:'story:loen-tax-5'},
    {id:'c',label:'维持旧制',detail:'1日 · 稳妥',days:1,follow:'你谢绝了聘书，也劝两方各退一步：税册照旧，赈济照办，谁也不当出头鸟。灰河镇恢复了往日的平静——只是那页旧星庭税目，你悄悄收进了怀里。',arc:{phase:5,dominantFaction:'洛恩地方官府'},setFlags:['loen-statusquo','crown-clue-loen'],flag:'story:loen-tax-5'},
  ],
  flags:['loen-autonomy','loen-crown-loyal','loen-statusquo','crown-clue-loen'],
},
// ============================================================
// 卡斯蒂亚帝国 · 鹰旗与铁印 —— 第二阶段（§3.2 对抗/抉择/余波）
// ============================================================
{ // 卡3 · 对抗：军功贵族与文官角力
  id:'castia-eagle-3',arcId:CA,phase:3,
  title:'帅帐之争',
  premise:`边境连吃两场败仗后，军务厅与朝廷的矛盾摆到了明面上。大元帅瓦里安在帅帐里挂起北境舆图，主张调集重兵、以战止战；首席大臣卢修斯·科尔的信使则带来了朝廷的旨意：裁减军费，先稳内政。

鹰嘴堡的军工作坊里，维塔·铁砧把一柄新铸的军刀拍在案上，冲你叹气："刀好打，仗难打。两边都要我交货，银子却只给一份。"

伊莲娜端着茶盘进来，压低声音："账房的信鸽今早又飞了三只。帅帐里的水，深得很。"她看了你一眼——这几年，你在军中、在商路、在驿站都留过名字。今晚帅帐点灯，缺一个能两边都说得上话的人。`,
  condition:s=>inCastia(s)&&!seenC(s,'castia-eagle-3')&&arcOf(s,CA).phase>=2&&(arcOf(s,CA).flags['castia-medic']||arcOf(s,CA).flags['castia-forge-pass']||arcOf(s,CA).flags['castia-petition']),
  deadline:{key:'castia-iron',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('军费之争拖垮前哨补给，边境防线后撤三十里');
    a.tension=Math.min(100,a.tension+10);a.danger=Math.min(100,a.danger+8);
    const ws=s.worldStory;if(ws&&ws.npcs['castia-varian']){ws.npcs['castia-varian'].trust=Math.max(0,ws.npcs['castia-varian'].trust-6);ch.push('瓦里安信任 −6 —— 帅帐等不来一个可托付的人');}
    return ch;
  }},
  choices:[
    {id:'a',label:'支持瓦里安整军',detail:'3日 · 剑术/指挥考验 · 功名',days:3,skill:'剑术',difficulty:24,reward:400,fame:8,follow:'你连夜把边境防线与敌情写成军报，替瓦里安争下增兵旨意。他按着刀柄看完军报，破天荒拍了拍你的肩："铁印刻在刀上，也刻在人心上。"',npc:[{id:'castia-varian',trust:12,affinity:6}],arc:{danger:-8,tension:6,phase:3},setFlags:['castia-side-army'],flag:'story:castia-eagle-3'},
    {id:'b',label:'支持卢修斯维稳',detail:'2日 · 礼仪/贸易考验',days:2,skill:'礼仪',difficulty:20,reward:300,fame:4,follow:'你替卢修斯的信使核算军费账目，把三处虚报的采买挑了出来。朝廷据此压下了裁军令，改以厘清军需——瓦里安听了，沉默半晌："账目清楚，仗才打得下去。"',npc:[{id:'castia-lucius',trust:10,interest:8}],arc:{tension:-8,phase:3},setFlags:['castia-side-court'],flag:'story:castia-eagle-3'},
    {id:'c',label:'两边通吃做军需',detail:'3日 · 8银 · 贸易 · 高风险',days:3,cost:800,reward:1500,follow:'你同时接下军务厅与朝廷的两份订单，从铁砧坊赊货、向商路调货，两头周转赚了差价。维塔看着账本直咂嘴："你这买卖做得，连仗都能拆开卖。"',npc:[{id:'castia-vita',trust:8,interest:12},{id:'castia-lucius',interest:6}],arc:{scarcity:10,tension:6,phase:3},setFlags:['castia-side-profit'],flag:'story:castia-eagle-3'},
  ],
  flags:['castia-side-army','castia-side-court','castia-side-profit'],
},
{ // 卡4 · 抉择：安全、功名、秩序与良知
  id:'castia-eagle-4',arcId:CA,phase:4,
  title:'雪线之选',
  premise:`入冬第一场雪落下的前夜，一支劫掠队从北境方向摸进边境，烧了三个村庄，抢走两车军粮。瓦里安连夜点兵追击，卢修斯却送来急令：边境不可擅动，先固防再论战。

追兵已经出城，可雪线将至——出城，可能追不回劫匪还折损人马；固防，三个村庄的惨状会成为整个冬天的伤疤。伊莲娜在驿站门口等你，马已备好，缰绳上结着霜："你决定吧。是去追，还是去守。无论哪个，都有人会记你的名字。"`,
  condition:s=>inCastia(s)&&!seenC(s,'castia-eagle-4')&&arcOf(s,CA).phase>=3&&(arcOf(s,CA).flags['castia-side-army']||arcOf(s,CA).flags['castia-side-court']||arcOf(s,CA).flags['castia-side-profit']),
  deadline:{key:'castia-raid',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('劫掠队远遁北境，三个村庄断粮一冬，边境人心涣散');
    a.danger=Math.min(100,a.danger+10);a.tension=Math.min(100,a.tension+6);
    const ws=s.worldStory;if(ws&&ws.npcs['castia-elena']){ws.npcs['castia-elena'].trust=Math.max(0,ws.npcs['castia-elena'].trust-5);ch.push('伊莲娜信任 −5 —— 她等的人没有出现');}
    return ch;
  }},
  choices:[
    {id:'a',label:'率队追击劫掠者',detail:'4日 · 剑术/骑术考验 · 高风险 · 功名',days:4,skill:'剑术',difficulty:30,reward:700,fame:12,hurt:10,follow:'你带着二十骑追过雪线，在冻河边截住劫掠队，夺回军粮与俘虏。回城时你浑身是伤，瓦里安亲自在城门口接你，行了一个完整的军礼："帝国记住你了。"',npc:[{id:'castia-varian',trust:14,affinity:8}],arc:{danger:-10,knowledge:10,phase:4},setFlags:['castia-pursuit'],flag:'story:castia-eagle-4'},
    {id:'b',label:'固防并安置灾民',detail:'3日 · 礼仪/医术考验 · 声望',days:3,skill:'医术',difficulty:22,reward:350,fame:10,follow:'你按兵不动，把三个村庄的灾民收进鹰嘴堡，开仓赈济、编队守夜。卢修斯送来褒奖令，瓦里安却罕见地没说什么——他知道，有些仗赢在账面上，有些仗赢在人心上。',npc:[{id:'castia-elena',trust:12,affinity:8},{id:'castia-lucius',trust:6}],arc:{tension:-8,phase:4},setFlags:['castia-defend'],flag:'story:castia-eagle-4'},
    {id:'c',label:'修固军工作坊备战',detail:'3日 · 锻造/贸易考验',days:3,skill:'锻造',difficulty:24,reward:500,follow:'你带着铁砧坊连夜赶制守城器械，把箭楼、拒马与粮仓都加固了一遍。维塔·铁砧把新铸的军刀塞给你："边境有你这号人，铁价再涨也值。"',npc:[{id:'castia-vita',trust:10,affinity:6}],arc:{scarcity:6,danger:-6,phase:4},setFlags:['castia-fortify'],flag:'story:castia-eagle-4'},
  ],
  flags:['castia-pursuit','castia-defend','castia-fortify'],
},
{ // 卡5 · 余波：鹰旗落定
  id:'castia-eagle-5',arcId:CA,phase:5,
  title:'鹰旗落定',
  premise:`春雪消融时，边境终于传来休战的文书。军费削减、伤兵遣返、商路重开——鹰嘴堡的城门卸下了宵禁的木栅，铁砧坊的炉火第一次在白天歇了下来。

瓦里安在城楼上请你看了一场落日。他说，帝国这面鹰旗，扛在肩上比挂在墙上重得多。伊莲娜在驿站里摆了桌酒，席间递给你一卷盖着军务厅与朝廷双印的文书——是嘉奖，也是询问：边境这道口子，往后你想守成什么样？

你展开文书时，从夹页里滑出一枚铸着旧星庭纹章的鹰爪铁印。它不该出现在这里——除非，有人的目光，早已越过边境。`,
  condition:s=>inCastia(s)&&!seenC(s,'castia-eagle-5')&&arcOf(s,CA).phase>=4&&(arcOf(s,CA).flags['castia-pursuit']||arcOf(s,CA).flags['castia-defend']||arcOf(s,CA).flags['castia-fortify']),
  choices:[
    {id:'a',label:'整军经武守国门',detail:'1日 · 声望大涨',days:1,fame:12,follow:'你领下边镇守备之职，重整哨所、编练民兵。瓦里安卸任前把帅印交到你手里看了一眼，又收回去："帝国缺的不是帅，是肯守边的人。"',npc:[{id:'castia-varian',trust:12,relationship:'导师'}],arc:{phase:5,dominantFaction:'帝国军务厅'},setFlags:['castia-army-end','crown-clue-castia'],flag:'story:castia-eagle-5'},
    {id:'b',label:'促成停战与裁军',detail:'1日 · 声望',days:1,fame:8,follow:'你带着双印文书奔走王都，为边境争取到裁军换援的折中条款。卢修斯在文书末尾添了一笔你的名字："朝堂需要账目清楚的人，边境也需要。"',npc:[{id:'castia-lucius',trust:10,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'帝国朝廷'},setFlags:['castia-peace-end','crown-clue-castia'],flag:'story:castia-eagle-5'},
    {id:'c',label:'经营边境商路',detail:'1日 · 现金',days:1,reward:500,follow:'休战带来商机，你盘下驿站一半的货栈，把边境粮铁生意做成了南北通衢。维塔·铁砧的订单排到明年——她说，这是边境最好的时候。',npc:[{id:'castia-elena',trust:10,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'边境驿路'},setFlags:['castia-route-end','crown-clue-castia'],flag:'story:castia-eagle-5'},
  ],
  flags:['castia-army-end','castia-peace-end','castia-route-end','crown-clue-castia'],
},
// ============================================================
// 北境诸领 · 长冬盟誓 —— 第二阶段（§3.3 对抗/抉择/余波）
// ============================================================
{ // 卡3 · 对抗：隘口通行权之争
  id:'north-oath-3',arcId:NO,phase:3,
  title:'隘口的风雪',
  premise:`大雪封山第七天，狼喉隘两边的营地终于对峙起来。冻溪氏族把猎弓架在隘口东侧，灰峰氏族堵住西侧的粮道——谁都清楚，隘口一开一关之间，是活路与死路的分界。

布兰恩·白霜把两族族长叫到议帐，火塘里的柴烧得噼啪响。他盯着你们每一个人："隘口今天要有个说法。封，灰峰的人要饿；开，冻溪的冬猎地要丢。"

希尔达在你耳边低语："雪已经埋到膝盖了。再拖下去，风雪会替所有人做决定。"帐外的风，像狼在嚎。`,
  condition:s=>inNorth(s)&&!seenN(s,'north-oath-3')&&arcOf(s,NO).phase>=2&&(arcOf(s,NO).flags['north-mediate']||arcOf(s,NO).flags['north-investigate']||arcOf(s,NO).flags['north-caravan']),
  deadline:{key:'north-blizzard',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('隘口之争在暴雪中爆发械斗，两族各折数人，粮道彻底断绝');
    a.tension=Math.min(100,a.tension+12);a.scarcity=Math.min(100,a.scarcity+10);
    const ws=s.worldStory;if(ws&&ws.npcs['north-elin']){ws.npcs['north-elin'].trust=Math.max(0,ws.npcs['north-elin'].trust-6);ch.push('艾琳·冻溪信任 −6 —— 冻溪的雪地里等不来和解');}
    return ch;
  }},
  choices:[
    {id:'a',label:'支持冻溪封隘',detail:'2日 · 信任',days:2,follow:'你支持封隘保冬猎地，替冻溪向议会立下"开春以猎获补粮"的契书。艾琳·冻溪难得红了眼眶："雪地里有人信我，这冬天就没白熬。"',npc:[{id:'north-elin',trust:12,affinity:8}],arc:{tension:-6,danger:4,phase:3},setFlags:['north-side-freeze'],flag:'story:north-oath-3'},
    {id:'b',label:'支持灰峰开隘',detail:'2日 · 贸易/礼仪考验',days:2,skill:'贸易',difficulty:20,reward:350,follow:'你支持开隘换粮，与南方商队立下平价供粮的盟约。灰峰族长抚着新到的粮袋，朝你行了个北境礼："路通了，人就不算输。"',npc:[{id:'north-bran',trust:8},{id:'north-elin',affinity:-8}],arc:{scarcity:-8,tension:4,phase:3},setFlags:['north-side-open'],flag:'story:north-oath-3'},
    {id:'c',label:'组织修路绕隘',detail:'4日 · 生存/指挥考验 · 高风险',days:4,skill:'生存',difficulty:30,reward:500,follow:'你带一队猎户在暴雪里摸出一条绕隘的山径，沿途设下柴垛与避风帐。路修通那天，希尔达抚着新踩出的雪印说："北境最缺的，不是粮，是路。"',npc:[{id:'north-hilda',trust:12,affinity:8}],arc:{danger:10,knowledge:10,phase:3},setFlags:['north-road'],flag:'story:north-oath-3'},
  ],
  flags:['north-side-freeze','north-side-open','north-road'],
},
{ // 卡4 · 抉择：储粮、迁徙或远征
  id:'north-oath-4',arcId:NO,phase:4,
  title:'长冬的账',
  premise:`深冬的账终于摊了开来：按现在的存粮，北境诸领撑不到开春。议会一夜之间吵翻了天——有人说要率众南迁，有人要抢在雪化前打通南粮，还有人指着布兰恩的鼻子，要他交出罗德里克那笔"采矿契"的银钱来买粮。

布兰恩坐在主位上，脸上看不出表情。散会后，他把半壶酒推到你面前："三样路，你挑一样陪我走：南迁，赌命；开山，赌路；打猎，赌运气。"火塘里的火，映着他花白的鬓角。

你接过酒壶——北境的冬天，从来不是靠一个人扛过去的。`,
  condition:s=>inNorth(s)&&!seenN(s,'north-oath-4')&&arcOf(s,NO).phase>=3&&(arcOf(s,NO).flags['north-side-freeze']||arcOf(s,NO).flags['north-side-open']||arcOf(s,NO).flags['north-road']),
  deadline:{key:'north-famine',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('存粮告罄，北境入春前饿殍四起，数个村落举族南迁');
    a.scarcity=Math.min(100,a.scarcity+15);a.danger=Math.min(100,a.danger+8);
    const ws=s.worldStory;if(ws&&ws.npcs['north-bran']){ws.npcs['north-bran'].trust=Math.max(0,ws.npcs['north-bran'].trust-8);ch.push('布兰恩·白霜信任 −8 —— 他没能护住他的族人');}
    return ch;
  }},
  choices:[
    {id:'a',label:'率众南迁避冬',detail:'5日 · 指挥/生存考验 · 高风险',days:5,skill:'指挥',difficulty:28,reward:600,fame:10,follow:'你带着两族老弱沿新修的山径南迁，一路设营、分粮、断后。到南方时，队伍一个不少。希尔达在营地边咳着雪水笑了："北方人记路，也记人。"',npc:[{id:'north-hilda',trust:12,affinity:10}],arc:{scarcity:-12,tension:-6,phase:4},setFlags:['north-migrate'],flag:'story:north-oath-4'},
    {id:'b',label:'开山打通南粮',detail:'4日 · 生存/贸易考验 · 高风险',days:4,skill:'生存',difficulty:26,reward:500,follow:'你带粮队闯过灰峰控制的隘口，用布兰恩的旧契换回三车南粮。布兰恩验完粮，沉默地给你斟满酒："这碗酒，敬路。"',npc:[{id:'north-bran',trust:12,affinity:6}],arc:{scarcity:-14,phase:4},setFlags:['north-open-road'],flag:'story:north-oath-4'},
    {id:'c',label:'组织猎队远征',detail:'4日 · 弓术考验 · 高风险',days:4,skill:'弓术',difficulty:30,reward:700,hurt:8,follow:'你带猎队深入北林九日，猎回一批过冬的鹿与獾，肉干装了半仓。回来时你的手指冻裂了三根，艾琳·冻溪看着肉干，声音发颤："这冬天的命，是你一箭一箭攒回来的。"',npc:[{id:'north-elin',trust:10,affinity:8}],arc:{danger:-8,phase:4},setFlags:['north-hunt-deep'],flag:'story:north-oath-4'},
  ],
  flags:['north-migrate','north-open-road','north-hunt-deep'],
},
{ // 卡5 · 余波：雪融之后
  id:'north-oath-5',arcId:NO,phase:5,
  title:'雪融之后',
  premise:`开春的第一滴水，从狼喉隘的冰棱上落下来。熬过这个冬天的北境诸领，比往年更像一家人——也第一次在议会上，讨论"明年怎么办"。

布兰恩在雪融的河边等你。他说，罗德里克那笔采矿契的真相查清了，背后有南方的影子；他说，北境欠你的，不只是粮食，还有一条活路。

他递给你一卷羊皮，上面是议会新拟的盟誓条款，末尾空着一格——他们想让你来填：守猎地、开商路，还是立新规？你接过羊皮时，看见背面压着一枚旧星庭的冰纹徽记，埋在冻土里，像是被雪埋了很多年。`,
  condition:s=>inNorth(s)&&!seenN(s,'north-oath-5')&&arcOf(s,NO).phase>=4&&(arcOf(s,NO).flags['north-migrate']||arcOf(s,NO).flags['north-open-road']||arcOf(s,NO).flags['north-hunt-deep']),
  choices:[
    {id:'a',label:'立誓共守北境',detail:'1日 · 声望大涨',days:1,fame:12,follow:'你在盟誓羊皮上按下手印，北境诸领从此守望相助。布兰恩把一枚冰纹戒指褪下来递给你："北境认你。"',npc:[{id:'north-bran',trust:12,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'北境诸领议会'},setFlags:['north-pact','crown-clue-north'],flag:'story:north-oath-5'},
    {id:'b',label:'助冻溪自治立约',detail:'1日 · 信任',days:1,follow:'你替冻溪争取到独立的冬猎地与税权，两族以契代兵。艾琳·冻溪握着你手半晌："冻溪的雪，往后给你留着门。"',npc:[{id:'north-elin',trust:12,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'冻溪氏族'},setFlags:['north-clan-right','crown-clue-north'],flag:'story:north-oath-5'},
    {id:'c',label:'牵头打通南商路',detail:'1日 · 现金',days:1,reward:600,follow:'你以议会之名与南方商队立下常年供粮契，北境的皮毛与木材换回稳定的粮道。希尔达笑着摇头："你让北境学会了算账——这比打猎难。"',npc:[{id:'north-hilda',trust:10,relationship:'导师'}],arc:{phase:5,dominantFaction:'南向商路'},setFlags:['north-route','crown-clue-north'],flag:'story:north-oath-5'},
  ],
  flags:['north-pact','north-clan-right','north-route','crown-clue-north'],
},
// ============================================================
// 阿尔玛自由城邦 · 十二席议会 —— 第二阶段（§3.4 对抗/抉择/余波）
// ============================================================
{ // 卡3 · 对抗：议会、盐场与船坞互指
  id:'alma-ports-3',arcId:AL,phase:3,
  title:'三方的账',
  premise:`挤兑的潮水退了，可白帆港的裂痕没有弥合。议政厅里，梅拉·沃德拿着审计官的报告，指控盐场在沉船前三天虚报船货；盐场主拍案而起，反咬船坞的修船记录造假；卡洛·帆则把一叠卷宗摔在桌上——三年前港务署的采买单，有七成对不上账。

三个方向，三本账。围观的商人们窃窃私语，有人开始悄悄把货物从白帆港转往南岸的私港。伊索靠在廊柱上，冲你举了举酒杯："城邦的账，从来不是一个人的账。你站哪边，哪边的账就有人看。"

梅拉在散会后单独叫住你，声音压得很低："今晚，码头会有船。你若要真相，跟上来。"`,
  condition:s=>inAlma(s)&&!seenA(s,'alma-ports-3')&&arcOf(s,AL).phase>=2&&(arcOf(s,AL).flags['alma-reopen']||arcOf(s,AL).flags['alma-inject']||arcOf(s,AL).flags['alma-bottom']),
  deadline:{key:'alma-seal',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('三方互咬拖垮白帆港信用，货主转港，船坞工人再次停工');
    a.tension=Math.min(100,a.tension+10);a.scarcity=Math.min(100,a.scarcity+10);
    const ws=s.worldStory;if(ws&&ws.npcs['alma-kalo']){ws.npcs['alma-kalo'].trust=Math.max(0,ws.npcs['alma-kalo'].trust-6);ch.push('卡洛·帆信任 −6 —— 港务长在等一个敢对账的人');}
    return ch;
  }},
  choices:[
    {id:'a',label:'支持议会彻查盐场',detail:'3日 · 识字/礼仪考验 · 声望',days:3,skill:'识字',difficulty:22,reward:300,fame:8,follow:'你替审计官逐页核验盐场的船货单，在第三本账册里揪出伪造的印鉴。梅拉当庭宣判追缴，散会后郑重向你致意："城邦的信誉，需要你这样掰开揉碎算的人。"',npc:[{id:'alma-maira',trust:12,affinity:6}],arc:{tension:-8,knowledge:10,phase:3},setFlags:['alma-side-council'],flag:'story:alma-ports-3'},
    {id:'b',label:'支持船坞工人',detail:'2日 · 声望',days:2,fame:10,follow:'你带着船坞的工匠堵住议政厅，把欠薪与修船记录的矛盾摊到全港面前。卡洛亲自带队罢航，逼议会先结工钱。梅拉铁青着脸签了支付令，卡洛却冲你咧嘴："兄弟，这港，工人在，船就在。"',npc:[{id:'alma-kalo',trust:12,affinity:8}],arc:{tension:6,phase:3},setFlags:['alma-side-yard'],flag:'story:alma-ports-3'},
    {id:'c',label:'走私港贸易线',detail:'3日 · 潜行/贸易考验 · 高风险',days:3,skill:'潜行',difficulty:28,reward:800,follow:'你搭上南岸私港的船，替几批避税的货主转运，赚了厚厚一叠银票。伊索在私港的灯火下遇见你，笑得很深："白帆港养规矩，私港养胆子——你两样都有了。"',npc:[{id:'alma-iso',interest:12,trust:6}],arc:{danger:12,scarcity:-6,phase:3},setFlags:['alma-side-smuggle'],flag:'story:alma-ports-3'},
  ],
  flags:['alma-side-council','alma-side-yard','alma-side-smuggle'],
},
{ // 卡4 · 抉择：信用、走私与舆论
  id:'alma-ports-4',arcId:AL,phase:4,
  title:'港口的抉择',
  premise:`沉船的真相终于摆上台面：白鸥号底舱的凿痕、改过的保单、三年前那笔被做高的赔付——证据链一路指向议会某席的私账。消息被锁在议政厅的密匣里，可码头上已经有人开始打听"那艘船到底是谁凿的"。

梅拉连夜召你密谈，把密匣推到你面前："查到这里就够了。公布，城邦要流血；压下，还有退路。"卡洛在码头等你，说要你陪他把证据抄一份给全港的船工看；伊索则递来一张汇票："证据卖给我，价钱你开。"

同一个夜晚，三条路。港口的灯，亮到了天明。`,
  condition:s=>inAlma(s)&&!seenA(s,'alma-ports-4')&&arcOf(s,AL).phase>=3&&(arcOf(s,AL).flags['alma-side-council']||arcOf(s,AL).flags['alma-side-yard']||arcOf(s,AL).flags['alma-side-smuggle']),
  deadline:{key:'alma-verdict',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('真相流散成谣言，白帆港爆发罢航与哄抢，议政厅被迫闭门');
    a.tension=Math.min(100,a.tension+12);a.danger=Math.min(100,a.danger+10);
    const ws=s.worldStory;if(ws&&ws.npcs['alma-maira']){ws.npcs['alma-maira'].trust=Math.max(0,ws.npcs['alma-maira'].trust-6);ch.push('梅拉·沃德信任 −6 —— 她没能守住城邦的信用');}
    return ch;
  }},
  choices:[
    {id:'a',label:'公布真相换信用',detail:'2日 · 声望大涨',days:2,fame:14,follow:'你在码头当众公布全部证据，肇事议员被议会除名、追缴赔付。白帆港的信誉跌到谷底又慢慢爬回——梅拉说，城邦第一次"亏得清清楚楚"。',npc:[{id:'alma-maira',trust:12,affinity:6},{id:'alma-kalo',trust:8}],arc:{tension:-12,knowledge:18,phase:4},setFlags:['alma-credit'],flag:'story:alma-ports-4'},
    {id:'b',label:'扩大灰色贸易',detail:'3日 · 10银 · 贸易 · 高风险',days:3,cost:1000,reward:2000,follow:'你把证据扣下，转手把南岸私港做成明港，两头抽成。伊索在合同上签字时笑出声："城邦的信用塌了，你的信用立起来了——灰色的，也是信用。"',npc:[{id:'alma-iso',trust:12,interest:10}],arc:{danger:14,scarcity:-10,phase:4},setFlags:['alma-gray'],flag:'story:alma-ports-4'},
    {id:'c',label:'收买舆论定调',detail:'3日 · 礼仪/贸易考验 · 声望下降',days:3,skill:'礼仪',difficulty:20,reward:400,fame:-6,follow:'你花钱让酒馆与报馆把风向引向"海盗所为"，替议会挡下追责。梅拉沉默地签了你的账单，卡洛则在码头狠狠吐了口唾沫："账能买，人心买不了。"',npc:[{id:'alma-maira',trust:4},{id:'alma-kalo',affinity:-8}],arc:{tension:-6,danger:8,phase:4},setFlags:['alma-press'],flag:'story:alma-ports-4'},
  ],
  flags:['alma-credit','alma-gray','alma-press'],
},
{ // 卡5 · 余波：白帆港的新格局
  id:'alma-ports-5',arcId:AL,phase:5,
  title:'白帆的航向',
  premise:`春天的第一个航季，白帆港的桅杆比往年少了，也稳了。议会重组，盐场换了主人，船坞的工人第一次坐进了议政厅的旁听席——港口的规矩，终究被这场风波改写了。

梅拉在退居二席前，把一枚议事银钥交到你手里："白帆港认账本，也认人。"卡洛则在码头边摆了桌酒，问你要不要入港务。伊索站在汇兑所门口，远远地冲你举杯——他的账本上，你的名字已经写了好几页。

而你手里那枚旧星庭纹章的银币，是整理沉船遗物时从货舱夹层里翻出来的。它被海水泡得发绿，背面却清清楚楚刻着一行字："第七席·遗产·白帆港"。`,
  condition:s=>inAlma(s)&&!seenA(s,'alma-ports-5')&&arcOf(s,AL).phase>=4&&(arcOf(s,AL).flags['alma-credit']||arcOf(s,AL).flags['alma-gray']||arcOf(s,AL).flags['alma-press']),
  choices:[
    {id:'a',label:'入主议会立新规',detail:'1日 · 声望大涨',days:1,fame:12,follow:'你接下议事银钥，牵头重立港口章程：公开账目、工人议席、保险互助。白帆港成了六国商人们口中"账最干净"的港口。',npc:[{id:'alma-maira',trust:10,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'十二人议会'},setFlags:['alma-council-end','crown-clue-alma'],flag:'story:alma-ports-5'},
    {id:'b',label:'经营船坞与商队',detail:'1日 · 现金',days:1,reward:800,follow:'你盘下船坞与一支商队，把白帆港的货运做成了自己的营生。卡洛入股时说："兄弟合伙，账目要清，拳头要硬。"',npc:[{id:'alma-kalo',trust:12,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'船坞工人联盟'},setFlags:['alma-yard-end','crown-clue-alma'],flag:'story:alma-ports-5'},
    {id:'c',label:'做成灰色口岸',detail:'1日 · 现金大涨',days:1,reward:1200,follow:'你与伊索联手，把白帆港的暗税与私港生意做成了半公开的行当。港口的账照样清楚——只是有两本。伊索举杯："城邦嘛，账目清楚，什么都好谈。"',npc:[{id:'alma-iso',trust:10,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'琥珀商路同盟'},setFlags:['alma-gray-end','crown-clue-alma'],flag:'story:alma-ports-5'},
  ],
  flags:['alma-council-end','alma-yard-end','alma-gray-end','crown-clue-alma'],
},
// ============================================================
// 圣辉教国 · 白烛与灰书 —— 第二阶段（§3.5 对抗/抉择/余波）
// ============================================================
{ // 卡3 · 对抗：焚书派与救治派
  id:'holy-candle-3',arcId:HO,phase:3,
  title:'焚书的火',
  premise:`枢机奥古斯丁的焚书令终于贴到了圣泉镇的广场上：七日之内，一切涉"灰书"的抄本、笔记与药方，一律当众焚毁。修院院长克拉拉当街撕下半张告示，挡在修院门前，身后是瑟瑟发抖的抄书修士。

药园总管罗莎把最后一捆退热的药草锁进地窖，擦着手走出来："病人在等药，药方在等火。这世道，救人还得先救书。"

广场另一头，奥古斯丁的侍从抬来了柴垛。火焰映着围观信徒的脸，也映着克拉拉眼里的泪光。有人低声问，灰书里记的，到底是瘟疫的解法，还是魔鬼的名字？`,
  condition:s=>inHoly(s)&&!seenH(s,'holy-candle-3')&&arcOf(s,HO).phase>=2&&(arcOf(s,HO).flags['holy-rescue']||arcOf(s,HO).flags['holy-debate']||arcOf(s,HO).flags['holy-prove']),
  deadline:{key:'holy-trial',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('焚书令如期执行，灰书残页付之一炬，修会内部分裂公开化');
    a.tension=Math.min(100,a.tension+10);a.knowledge=Math.max(0,a.knowledge-8);
    const ws=s.worldStory;if(ws&&ws.npcs['holy-clara']){ws.npcs['holy-clara'].trust=Math.max(0,ws.npcs['holy-clara'].trust-6);ch.push('克拉拉信任 −6 —— 她没能保住修院的书');}
    return ch;
  }},
  choices:[
    {id:'a',label:'帮克拉拉偷运灰书',detail:'3日 · 潜行/元素考验 · 高风险',days:3,skill:'潜行',difficulty:26,reward:400,follow:'你趁夜与克拉拉把灰书残页分装进药箱，从修院地窖转运到城外磨坊。克拉拉望着远去的车队，声音哽咽："这些纸上记的，是命。"',npc:[{id:'holy-clara',trust:12,affinity:8}],arc:{knowledge:12,danger:8,phase:3},setFlags:['holy-side-clara'],flag:'story:holy-candle-3'},
    {id:'b',label:'支持奥古斯丁焚书',detail:'2日 · 礼仪 · 声望下降',days:2,skill:'礼仪',difficulty:18,reward:250,fame:-6,follow:'你公开支持焚书，称以太知识"不该由凡人触碰"。奥古斯丁难得对你点头，罗莎却在药园门口背过了身——她手边的药，正等着那些"被烧掉"的方子。',npc:[{id:'holy-augustine',trust:10,affinity:4},{id:'holy-rosa',affinity:-10}],arc:{tension:-6,knowledge:-6,phase:3},setFlags:['holy-side-augustine'],flag:'story:holy-candle-3'},
    {id:'c',label:'私下抄存残页',detail:'3日 · 识字/占卜考验',days:3,skill:'识字',difficulty:24,reward:300,follow:'你在焚书前夜潜入抄经房，把关键残页逐字誊抄两份——一份留给修院，一份藏进自己的行囊。罗莎见了，红着眼眶把一包药塞给你："这方子，就是从那页上来的。"',npc:[{id:'holy-rosa',trust:10,affinity:8}],arc:{knowledge:16,phase:3},setFlags:['holy-side-copy'],flag:'story:holy-candle-3'},
  ],
  flags:['holy-side-clara','holy-side-augustine','holy-side-copy'],
},
{ // 卡4 · 抉择：安全、真相与救治
  id:'holy-candle-4',arcId:HO,phase:4,
  title:'热病的源头',
  premise:`焚书的火熄了，热病却没有。圣泉镇的病人增加到上百人，罗莎的药园入不敷出；而你在灰书残页的夹层里，发现一段被划掉又补上的记录——病源指向圣泉镇老井，井底封着一段旧星庭时期的"净化法阵"。

消息传开，奥古斯丁连夜封锁老井，宣称"异端之源必须封印"；克拉拉则坚持打开井室，用残页记载的法阵救人。两派在井口对峙，病人的呻吟声从修院里一阵阵传来。

罗莎拉住你的衣袖，指尖冰凉："法阵的启动方式，只有残页上有。你说，救，还是封？"`,
  condition:s=>inHoly(s)&&!seenH(s,'holy-candle-4')&&arcOf(s,HO).phase>=3&&(arcOf(s,HO).flags['holy-side-clara']||arcOf(s,HO).flags['holy-side-augustine']||arcOf(s,HO).flags['holy-side-copy']),
  deadline:{key:'holy-plague',days:10,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('热病越过封锁蔓延三镇，朝圣路线彻底中断，教国陷入恐慌');
    a.danger=Math.min(100,a.danger+12);a.scarcity=Math.min(100,a.scarcity+10);
    const ws=s.worldStory;if(ws&&ws.npcs['holy-rosa']){ws.npcs['holy-rosa'].trust=Math.max(0,ws.npcs['holy-rosa'].trust-6);ch.push('罗莎信任 −6 —— 药园在等一个敢开井的人');}
    return ch;
  }},
  choices:[
    {id:'a',label:'公开病源与解法',detail:'3日 · 医术/占卜考验 · 声望大涨',days:3,skill:'医术',difficulty:28,reward:500,fame:14,follow:'你带人打开井室，按残页启动净化法阵，热病七日退尽。奥古斯丁沉默地看完整个仪式，最终没再开口。克拉拉在病愈的孩子们中间哭了一场。',npc:[{id:'holy-clara',trust:12,affinity:8},{id:'holy-rosa',trust:10}],arc:{knowledge:20,danger:-10,tension:-8,phase:4},setFlags:['holy-truth-heal'],flag:'story:holy-candle-4'},
    {id:'b',label:'秘密救治病人',detail:'3日 · 医术考验 · 风险',days:3,skill:'医术',difficulty:24,reward:400,follow:'你夜里偷偷开井取水、按残页配药，瞒着枢机救下了几十名病人。罗莎每夜替你放风，天亮前把药渣埋进药园。奥古斯丁查了几次，都扑了空——可他看你的眼神，越来越冷。',npc:[{id:'holy-rosa',trust:12,affinity:10},{id:'holy-augustine',trust:-8}],arc:{danger:8,knowledge:10,phase:4},setFlags:['holy-secret-heal'],flag:'story:holy-candle-4'},
    {id:'c',label:'护送学者出境求援',detail:'4日 · 潜行/骑术考验 · 高风险',days:4,skill:'潜行',difficulty:26,reward:350,follow:'你把残页拓本交给一位学者，护他翻山去阿尔玛求援。路上被枢机的人追了一次，你断后受伤，但拓本送出去了。二十天后，南方的药与医者抵达圣泉镇。',npc:[{id:'holy-clara',trust:8},{id:'holy-augustine',trust:-6}],arc:{danger:10,phase:4},setFlags:['holy-escape'],flag:'story:holy-candle-4'},
  ],
  flags:['holy-truth-heal','holy-secret-heal','holy-escape'],
},
{ // 卡5 · 余波：白烛重燃
  id:'holy-candle-5',arcId:HO,phase:5,
  title:'白烛重燃',
  premise:`热病平息后的圣辉教国，安静得有些不真实。朝圣路重新开通，药园的炉火日夜不歇；奥古斯丁调离了圣泉教区，枢机团派来的新任审查官，态度暧昧不明。

克拉拉在修院的烛光里找你，说修会要重编医典，问你是否愿意列名；罗莎把一坛新酿的药酒放在你门口，附了张字条："井水干净了，人心还脏着，你要多保重。"修院地窖的暗格里，灰书残页被重新装订，扉页上多了一行小字——"以此书，救此生"。

而你从老井底的淤泥里，摸出一枚刻着旧星庭纹章的白烛铜徽。烛芯早熄了，铜徽背面却压着一行字："第一席·遗产·白烛"。`,
  condition:s=>inHoly(s)&&!seenH(s,'holy-candle-5')&&arcOf(s,HO).phase>=4&&(arcOf(s,HO).flags['holy-truth-heal']||arcOf(s,HO).flags['holy-secret-heal']||arcOf(s,HO).flags['holy-escape']),
  choices:[
    {id:'a',label:'支持修会改革',detail:'1日 · 声望大涨',days:1,fame:12,follow:'你列名重编医典，主张"以证行医、以实存书"。修会的新规传遍教国，克拉拉把白烛铜徽系在你衣襟上："医者之心，是教国最好的经。"',npc:[{id:'holy-clara',trust:12,relationship:'导师'}],arc:{phase:5,dominantFaction:'白烛修会'},setFlags:['holy-reform','crown-clue-holy'],flag:'story:holy-candle-5'},
    {id:'b',label:'助教廷重建秩序',detail:'1日 · 声望',days:1,fame:8,follow:'你接受审查官之请，协助重立教廷对以太知识的审验规矩——先验再存，不轻易焚毁。奥古斯丁的继任者郑重谢过你，修院的书架重新堆满了卷宗。',npc:[{id:'holy-augustine',trust:10,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'枢机团'},setFlags:['holy-order','crown-clue-holy'],flag:'story:holy-candle-5'},
    {id:'c',label:'筹办世俗学院',detail:'1日 · 现金',days:1,reward:500,follow:'你用灰书残页与药园经验，在圣泉镇外筹办一所"医理学堂"，学者与匠人皆可入学。罗莎来授课的第一天，给学生们每人分了一株薄荷："先学会闻，再学会信。"',npc:[{id:'holy-rosa',trust:12,relationship:'伙伴'}],arc:{phase:5,dominantFaction:'圣泉学院'},setFlags:['holy-school','crown-clue-holy'],flag:'story:holy-candle-5'},
  ],
  flags:['holy-reform','holy-order','holy-school','crown-clue-holy'],
},
// ============================================================
// NPC 个人关系事件（§4）：好感/信任/利益达到阈值后触发
// 关系只能由长期行动推动；一次事件可升级为伙伴/恋人/导师/竞争者
// ============================================================
{ // 贝拉 · 行会之约（伙伴）
  id:'npc-bella',arcId:'npc',phase:1,kindName:'关系 · 贝拉',
  title:'行会的钥匙',
  premise:`灰河镇的晚市散尽后，贝拉在行会仓库的烛火下等你。桌上摊着一卷盖着行会印的文书，还有一把铜钥匙——钥匙柄上缠着旧绒线，是她从祖父手里接过来的那把。

"行会这些年，账目是我一个人扛的。"她给自己倒了杯酒，没看你，"税册的事之后，我一直在想，灰河镇总得有人替说话的人撑腰。你做事，我信得过。"

她把钥匙推到你面前："行会执事，一年一任，出入账目自由查看。你若肯，灰河镇的账，从今往后咱们一起算。"`,
  condition:s=>s.region===0&&!arcSeen(s,'npc','npc-bella')&&(s.worldStory?.npcs?.['loen-bella']?.affinity??0)>=55,
  choices:[
    {id:'a',label:'接下行会执事',detail:'1日 · 关系深化',days:1,follow:'你接下铜钥匙，在行会账册上签下名字。贝拉破天荒笑了一下："往后镇上的账，有我一份，也有你一份。"',npc:[{id:'loen-bella',relationship:'伙伴',memory:'玩家接下灰河行会执事之职',affinity:8}],arc:{phase:1},setFlags:['npc-bella-partner'],flag:'story:npc-bella'},
    {id:'b',label:'帮她盘清暗账',detail:'2日 · 识字考验',days:2,skill:'识字',difficulty:16,reward:200,follow:'你没接钥匙，却连夜替她盘清了那笔"防火钱"的去向——账目清清楚楚，落款是边境民兵。贝拉握着账本沉默半晌："这账我记你一辈子。"',npc:[{id:'loen-bella',trust:12,affinity:6}],arc:{phase:1,knowledge:8},setFlags:['npc-bella-helper'],flag:'story:npc-bella'},
    {id:'c',label:'婉拒保持距离',detail:'1日',days:1,follow:'你谢过她的好意，说只想做个自在人。贝拉收回钥匙，笑了笑："也好。行会欠你人情，往后镇上有什么难处，你来找我。"',npc:[{id:'loen-bella',affinity:4}],arc:{phase:1},setFlags:['npc-bella-friend'],flag:'story:npc-bella'},
  ],
  flags:['npc-bella-partner','npc-bella-helper','npc-bella-friend'],
},
{ // 赛门 · 灰书之外（秘密·伙伴）
  id:'npc-simon',arcId:'npc',phase:1,kindName:'关系 · 赛门',
  title:'银戒指',
  premise:`赛门·霍姆在税署的偏院找到你时，指节发白地攥着一枚银戒指——就是他要寄往王都的那一枚。他张了张嘴，半晌才开口："我女儿……病了。圣辉的医师说，只有一种药能救，药引在灰书残页里。"

他苦笑了一下："我是税务官，我知道灰书是什么罪名。可她是我的女儿。你若肯帮我把药引的方子抄出来，税署那边，往后灰河镇的账，我替你圆。"

一枚银戒指放在你手心里，还带着体温。他知道，这是把把柄交到了你手上。`,
  condition:s=>s.region===0&&!arcSeen(s,'npc','npc-simon')&&(s.worldStory?.npcs?.['loen-simon']?.trust??0)>=50,
  choices:[
    {id:'a',label:'替他抄录药方',detail:'3日 · 识字/医术考验',days:3,skill:'识字',difficulty:20,reward:300,follow:'你托圣辉的药商辗转抄回药引方子，又亲自配齐寄出。赛门接到信时，手指抖得半天没拆开。后来他专程来谢你，把银戒指留在了你桌上："王都税署，从此有你一个朋友。"',npc:[{id:'loen-simon',trust:12,relationship:'伙伴',memory:'玩家救了他的女儿',affinity:8}],arc:{phase:1},setFlags:['npc-simon-help'],flag:'story:npc-simon'},
    {id:'b',label:'陪他走一趟圣辉',detail:'5日 · 骑术/医术考验',days:5,skill:'医术',difficulty:24,reward:400,follow:'你放下手头的事，陪他连夜赶赴圣辉求药。药引到手那天，赛门在修院门口哭得像个孩子。回程路上他说："灰河镇有你，是税署的运气。"',npc:[{id:'loen-simon',trust:14,relationship:'伙伴',affinity:10}],arc:{phase:1,danger:6},setFlags:['npc-simon-accompany'],flag:'story:npc-simon'},
    {id:'c',label:'劝他走正途',detail:'1日 · 礼仪',days:1,skill:'礼仪',difficulty:14,follow:'你劝他把实情上报税署，按规矩申请特批。赛门盯着银戒指看了很久，最终点了点头："你说得对。女儿的病，不该用灰书的罪来换。"',npc:[{id:'loen-simon',trust:8,affinity:4}],arc:{phase:1},setFlags:['npc-simon-honest'],flag:'story:npc-simon'},
  ],
  flags:['npc-simon-help','npc-simon-accompany','npc-simon-honest'],
},
{ // 瓦里安 · 帅帐授刀（导师）
  id:'npc-varian',arcId:'npc',phase:1,kindName:'关系 · 瓦里安',
  title:'帅帐授刀',
  premise:`边境的操演结束后，瓦里安把马停在河滩边，等了你一程。他从鞍袋里取出一柄旧军刀——刀鞘磨得发白，刃口却保养得锃亮。

"这是我年轻时第一次上阵用的刀。"他说，目光落在河对岸的荒原上，"刀能教人怎么活，也能教人怎么死。帝国不缺刀，缺的是知道什么时候该把刀收回去的人。"

他把刀横在两人之间："你若愿意，往后每旬操演后，来我帐中。行军、扎营、看地势、识人心——我教你。学不学得会，看你。"`,
  condition:s=>s.region===1&&!arcSeen(s,'npc','npc-varian')&&(s.worldStory?.npcs?.['castia-varian']?.trust??0)>=55,
  choices:[
    {id:'a',label:'拜他为师学军略',detail:'3日 · 指挥/剑术考验',days:3,skill:'指挥',difficulty:22,reward:300,follow:'你正式执弟子礼。此后每旬操演，帅帐的烛火都亮到深夜。瓦里安教你看地势、识人心，也教你——有些仗，不打才是赢。',npc:[{id:'castia-varian',relationship:'导师',memory:'玩家拜瓦里安为师',trust:10,affinity:6}],arc:{phase:1,knowledge:10},setFlags:['npc-varian-student'],flag:'story:npc-varian'},
    {id:'b',label:'随他巡查边哨',detail:'4日 · 骑术/生存考验',days:4,skill:'骑术',difficulty:20,reward:250,follow:'你陪他巡查了边境三座哨所，一路听他讲每处山坳的战史。回来时你手里多了一卷手绘的边防图——那是他亲笔画的。',npc:[{id:'castia-varian',trust:10,affinity:6}],arc:{phase:1,knowledge:8},setFlags:['npc-varian-patrol'],flag:'story:npc-varian'},
    {id:'c',label:'婉谢却收下刀',detail:'1日',days:1,item:'旧军刀',follow:'你说自己志不在此，却郑重收下了那把旧刀。瓦里安点点头，没再多言。此后边关偶遇，他会多看你一眼——那一眼里，有认可，也有叹息。',npc:[{id:'castia-varian',affinity:4}],arc:{phase:1},setFlags:['npc-varian-respect'],flag:'story:npc-varian'},
  ],
  flags:['npc-varian-student','npc-varian-patrol','npc-varian-respect'],
},
{ // 伊莲娜 · 驿站灯火（恋人/伙伴）
  id:'npc-elena',arcId:'npc',phase:1,kindName:'关系 · 伊莲娜',
  title:'驿站的灯火',
  premise:`鹰嘴堡的驿站打烊后，伊莲娜把最后一位客人送出门，熄了半盏灯，留了一盏在柜台。她靠在那儿，手指无意识地摩挲着账本边角，忽然开口："这几年，过境的人来来去去，能坐下来陪我喝杯酒的，没几个。"

她把一杯温好的酒推过来，目光在灯影里显得格外认真："边境的消息，我都知道。往后的路，我想分你一条——不是生意，是我信你。"

驿站的灯，照着两个人影。她没明说，可那杯酒的温度，谁都尝得出来。`,
  condition:s=>s.region===1&&!arcSeen(s,'npc','npc-elena')&&(s.worldStory?.npcs?.['castia-elena']?.affinity??0)>=55,
  choices:[
    {id:'a',label:'与她结为知己',detail:'1日 · 关系深化',days:1,follow:'你接过那杯酒，一饮而尽。此后驿站的灯火，总有一盏是为你留的。她开始把过境的情报先递给你看——边境的事，从此你们一起扛。',npc:[{id:'castia-elena',relationship:'恋人',memory:'玩家与伊莲娜结为知己',affinity:10,trust:8}],arc:{phase:1},setFlags:['npc-elena-lover'],flag:'story:npc-elena'},
    {id:'b',label:'结为过命之交',detail:'1日',days:1,follow:'你把酒喝了，却没接她话里的深意，只郑重道了句"过命之交"。她愣了愣，随即笑了，眼角的灯影晃了晃："也好，朋友比什么都长久。"',npc:[{id:'castia-elena',relationship:'伙伴',affinity:8}],arc:{phase:1},setFlags:['npc-elena-friend'],flag:'story:npc-elena'},
    {id:'c',label:'只谈生意',detail:'1日 · 现金',days:1,reward:200,follow:'你岔开话题，把驿站的消息买卖谈成了生意。伊莲娜的笑意淡了些，却仍利落地给你列了价目表："生意就生意，账目清楚。"',npc:[{id:'castia-elena',interest:8,affinity:-4}],arc:{phase:1},setFlags:['npc-elena-deal'],flag:'story:npc-elena'},
  ],
  flags:['npc-elena-lover','npc-elena-friend','npc-elena-deal'],
},
{ // 希尔达 · 火塘讲学（导师）
  id:'npc-hilda',arcId:'npc',phase:1,kindName:'关系 · 希尔达',
  title:'火塘讲学',
  premise:`北境的雪夜，希尔达的火塘边总是围着人。这天她拨开人群，把一卷旧羊皮塞进你手里——上面用北境古字抄着一段传说，讲的是"会发光的树根"。

"我年轻时在暮林边境见过那东西。"她压低声音，火光在她眼角的皱纹里跳动，"信的人不多了，但我一直留着这段记录。你若想学，往后每个雪夜，来我火塘边——识天文、认药草、读旧契，我教。"

她把羊皮卷好推过来，指尖顿了顿："北境的路，光靠力气走不远。你是个肯学的人，我这样的老骨头，愿意多教几个。"`,
  condition:s=>s.region===2&&!arcSeen(s,'npc','npc-hilda')&&(s.worldStory?.npcs?.['north-hilda']?.affinity??0)>=55,
  choices:[
    {id:'a',label:'拜她为师',detail:'3日 · 识字/占卜考验',days:3,skill:'识字',difficulty:20,reward:250,follow:'此后每个雪夜，火塘边都多一个学生。希尔达教你看星象、认旧契、辨药草，也讲那些"发光树根"的旧事——她说，知识是北境最耐烧的柴。',npc:[{id:'north-hilda',relationship:'导师',memory:'玩家拜希尔达为师',trust:10,affinity:6}],arc:{phase:1,knowledge:12},setFlags:['npc-hilda-student'],flag:'story:npc-hilda'},
    {id:'b',label:'替她整理旧档',detail:'2日 · 识字',days:2,skill:'识字',difficulty:16,reward:200,follow:'你帮她把积压的议会旧档分门别类，顺带誊抄了两卷珍贵的地契。希尔达看着整整齐齐的卷宗，难得露出笑意："这手笔，是北境缺的。"',npc:[{id:'north-hilda',trust:10,affinity:6}],arc:{phase:1,knowledge:6},setFlags:['npc-hilda-archive'],flag:'story:npc-hilda'},
    {id:'c',label:'只要那卷传说',detail:'1日',days:1,follow:'你只要了那卷"发光树根"的羊皮，郑重道谢。希尔达点点头："传说是传说的命，你是你的命。拿去吧，信不信由你。"',npc:[{id:'north-hilda',affinity:4}],arc:{phase:1},setFlags:['npc-hilda-take'],flag:'story:npc-hilda'},
  ],
  flags:['npc-hilda-student','npc-hilda-archive','npc-hilda-take'],
},
{ // 布兰恩 · 雪原盟约（伙伴）
  id:'npc-bran',arcId:'npc',phase:1,kindName:'关系 · 布兰恩',
  title:'雪原盟约',
  premise:`雪停的午后，布兰恩·白霜牵着一匹披着厚毯的老马，在冻河边的冰面上等你。他望着远处被雪压弯的松林，忽然开口："我这辈子，信过很多人，也看错过很多人。"

他从怀里摸出一把短匕，柄上镶着一颗冻得发白的狼牙："北境的老规矩，交换信物，就是换命。罗德里克的事之后，我想找个能托付的人——不是替我办事，是替北境办事。"

狼牙短匕横在他粗粝的手掌里："你若肯接，北境的雪原，往后有你一席。你若不肯，就当我没说过。"`,
  condition:s=>s.region===2&&!arcSeen(s,'npc','npc-bran')&&(s.worldStory?.npcs?.['north-bran']?.trust??0)>=55,
  choices:[
    {id:'a',label:'接下狼牙短匕',detail:'1日 · 关系深化',days:1,item:'狼牙短匕',follow:'你接过短匕，割破指尖，与他在冰面上立下雪原之约。布兰恩罕见地笑了，笑声震落松枝上的雪："北境认人，一诺千斤。"',npc:[{id:'north-bran',relationship:'伙伴',memory:'玩家与布兰恩立下雪原盟约',trust:10,affinity:8}],arc:{phase:1},setFlags:['npc-bran-oath'],flag:'story:npc-bran'},
    {id:'b',label:'立契合作守粮',detail:'2日 · 贸易/礼仪',days:2,skill:'贸易',difficulty:18,reward:300,follow:'你没接信物，却与他立下粮食与猎获的常年交换契。布兰恩收起短匕，点点头："不换命，换粮，也行。北境记你这份实诚。"',npc:[{id:'north-bran',trust:10,interest:8}],arc:{phase:1},setFlags:['npc-bran-trade'],flag:'story:npc-bran'},
    {id:'c',label:'婉拒只做朋友',detail:'1日',days:1,follow:'你谢过他的信任，说不愿被誓言绑住。布兰恩沉默片刻，把短匕收回怀里："也好。朋友，比盟约轻松。"',npc:[{id:'north-bran',affinity:4}],arc:{phase:1},setFlags:['npc-bran-friend'],flag:'story:npc-bran'},
  ],
  flags:['npc-bran-oath','npc-bran-trade','npc-bran-friend'],
},
{ // 梅拉 · 议政厅的账本（伙伴）
  id:'npc-maira',arcId:'npc',phase:1,kindName:'关系 · 梅拉',
  title:'议政厅的账本',
  premise:`白帆港的夜潮涨起来时，梅拉·沃德独自坐在议政厅的顶层，面前摊着一本锁着的厚账。她没回头，声音却像对你说的："我祖父是码头记账的，我父亲是议会的书记员，到我，坐进了议政厅。"

她翻开账本，里面夹着一页泛黄的旧纸："这是白鸥号出事前，有人从旧档案里抽走的一页——第七席的遗产清单。城邦的账，不止银子，还有这些说不清的东西。"

她合上账本，认真看着你："我信你的眼睛。往后议会要查的账，我想请你一起看——不看银子，看人心。"`,
  condition:s=>s.region===3&&!arcSeen(s,'npc','npc-maira')&&(s.worldStory?.npcs?.['alma-maira']?.trust??0)>=55,
  choices:[
    {id:'a',label:'做议会的眼睛',detail:'1日 · 关系深化',days:1,follow:'你应下这份差事。此后议会密议的账目，总有你一份誊本。梅拉在散会后的走廊低声说："城邦的账，以后有你一半眼睛。"',npc:[{id:'alma-maira',relationship:'伙伴',memory:'玩家成为议会的信任之眼',trust:10,affinity:6}],arc:{phase:1},setFlags:['npc-maira-partner'],flag:'story:npc-maira'},
    {id:'b',label:'帮她追查第七席',detail:'3日 · 潜行/识字考验',days:3,skill:'潜行',difficulty:24,reward:350,follow:'你顺着那页清单追查"第七席"的旧档，在港务署的地窖里翻出半卷烧剩的记录。梅拉看完，指尖发凉："这城邦的水，比海深。"',npc:[{id:'alma-maira',trust:12,affinity:6}],arc:{phase:1,knowledge:10},setFlags:['npc-maira-probe'],flag:'story:npc-maira'},
    {id:'c',label:'婉拒只谈生意',detail:'1日 · 现金',days:1,reward:200,follow:'你推说对议政厅的水太深没有兴趣，只接了账目核验的委托。梅拉没有强求，只是看你的眼神里，少了一分温度。',npc:[{id:'alma-maira',interest:6,affinity:-4}],arc:{phase:1},setFlags:['npc-maira-deal'],flag:'story:npc-maira'},
  ],
  flags:['npc-maira-partner','npc-maira-probe','npc-maira-deal'],
},
{ // 卡洛 · 码头的酒碗（伙伴/竞争者）
  id:'npc-kalo',arcId:'npc',phase:1,kindName:'关系 · 卡洛',
  title:'码头的酒碗',
  premise:`白帆港收工后，卡洛·帆蹲在船坞边，把一坛酒往墩台上一放，拍着身边的空位示意你坐。浪声里，他给自己倒了满满一碗："我这一辈子，在码头搬过货、在船上挨过刀、在议会挨过骂。信过的人不多，但每一个，我都当兄弟。"

他仰头灌下半碗，抹了把嘴："你这个人，做事不绕弯子，我瞧得上。往后港上有人为难你，报我卡洛的名字；我有难处，也来找你——不是客套，是酒碗里的规矩。"

浪打墩台，酒香混着海风。他等着你端碗。`,
  condition:s=>s.region===3&&!arcSeen(s,'npc','npc-kalo')&&(s.worldStory?.npcs?.['alma-kalo']?.affinity??0)>=60,
  choices:[
    {id:'a',label:'端碗结拜',detail:'1日 · 关系深化',days:1,follow:'你端碗与他碰了一下，一饮而尽。卡洛咧嘴大笑，拍着你肩膀："从今往后，港上的事就是咱俩的事！"',npc:[{id:'alma-kalo',relationship:'伙伴',memory:'玩家与卡洛码头结拜',affinity:10,trust:8}],arc:{phase:1},setFlags:['npc-kalo-brother'],flag:'story:npc-kalo'},
    {id:'b',label:'合伙跑船',detail:'2日 · 贸易/航海考验',days:2,skill:'贸易',difficulty:18,reward:400,follow:'你没接酒碗，却提出与他合伙跑一条近海航线。卡洛眼睛一亮，酒碗一放，掏出张海图就铺在墩台上："生意归生意，兄弟归兄弟——这单，咱俩五五分！"',npc:[{id:'alma-kalo',trust:10,interest:10}],arc:{phase:1},setFlags:['npc-kalo-partner'],flag:'story:npc-kalo'},
    {id:'c',label:'只当点头之交',detail:'1日',days:1,follow:'你接过酒碗抿了一口，却婉拒了结拜。卡洛也不恼，把酒坛往怀里一揽："行，酒照喝，路各走。"',npc:[{id:'alma-kalo',affinity:2}],arc:{phase:1},setFlags:['npc-kalo-acquaint'],flag:'story:npc-kalo'},
  ],
  flags:['npc-kalo-brother','npc-kalo-partner','npc-kalo-acquaint'],
},
{ // 克拉拉 · 修院之约（导师）
  id:'npc-clara',arcId:'npc',phase:1,kindName:'关系 · 克拉拉',
  title:'修院之约',
  premise:`圣泉镇的晨祷结束后，克拉拉在修院回廊的阴影里等你。她手里捧着一册手抄的医典，封皮磨得起了毛边："这是我在修院三十年，一笔一笔攒下来的——病症、药方、失败的病例，都在这上面。"

她把医典递过来，指腹轻轻划过封面："灰书的事之后，我想明白了：救人的本事，不能只锁在修院里。你若肯学，我教你诊脉、配药、认病——不收学徒钱，只收一个承诺：往后你救的人，你都要记得。"

晨光穿过回廊，落在她花白的发上。她等你的回答。`,
  condition:s=>s.region===4&&!arcSeen(s,'npc','npc-clara')&&(s.worldStory?.npcs?.['holy-clara']?.trust??0)>=55,
  choices:[
    {id:'a',label:'拜她为师学医',detail:'3日 · 医术考验',days:3,skill:'医术',difficulty:20,reward:300,follow:'你执学徒礼，此后修院的诊室里多了一个帮手。克拉拉手把手教你诊脉配药，也教你记得每一个病人的名字。',npc:[{id:'holy-clara',relationship:'导师',memory:'玩家拜克拉拉为师',trust:10,affinity:8}],arc:{phase:1,knowledge:10},setFlags:['npc-clara-student'],flag:'story:npc-clara'},
    {id:'b',label:'帮她誊抄医典',detail:'2日 · 识字',days:2,skill:'识字',difficulty:16,reward:250,follow:'你帮她誊抄医典，分卷装订，又补上几味新药。克拉拉翻着新抄的册子，眼眶微红："这书，总算有人接得住。"',npc:[{id:'holy-clara',trust:10,affinity:6}],arc:{phase:1},setFlags:['npc-clara-copy'],flag:'story:npc-clara'},
    {id:'c',label:'只取一剂药方',detail:'1日',days:1,follow:'你只求她抄了一剂救急的药方，郑重道谢。克拉拉点头，在方子末尾添了一行小字——"此方救人，此心救己"。',npc:[{id:'holy-clara',affinity:4}],arc:{phase:1},setFlags:['npc-clara-recipe'],flag:'story:npc-clara'},
  ],
  flags:['npc-clara-student','npc-clara-copy','npc-clara-recipe'],
},
{ // 罗莎 · 药园的薄荷（恋人/伙伴）
  id:'npc-rosa',arcId:'npc',phase:1,kindName:'关系 · 罗莎',
  title:'药园的薄荷',
  premise:`圣泉药园的黄昏，罗莎蹲在薄荷畦边拔草，听见脚步声也不抬头："药园一日没人说话，薄荷就长疯了。"她拍拍手上的泥，指给你看一株新培的薄荷苗："这株，我从暮林带回来的，闻闻。"

她把叶片揉开凑到你鼻尖，清凉里带一丝涩："热病之后，我总想，药这东西，救得了身子，救不了人心。可人总得信点什么，对吧？"

暮色里，她耳根有些红，声音却稳："你要是愿意，往后常来药园坐坐——陪我拔草也行。"`,
  condition:s=>s.region===4&&!arcSeen(s,'npc','npc-rosa')&&(s.worldStory?.npcs?.['holy-rosa']?.affinity??0)>=60,
  choices:[
    {id:'a',label:'常来药园相守',detail:'1日 · 关系深化',days:1,follow:'你答应下来。此后药园的薄荷畦边，总有两个身影。罗莎把一株薄荷苗移进陶盆送你，声音低低的："园子等你。"',npc:[{id:'holy-rosa',relationship:'恋人',memory:'玩家与罗莎在药园相守',affinity:10,trust:8}],arc:{phase:1},setFlags:['npc-rosa-lover'],flag:'story:npc-rosa'},
    {id:'b',label:'结为药友',detail:'1日',days:1,follow:'你接下薄荷，郑重道了句"药友"。罗莎先是一愣，随即笑得眉眼弯弯："也好。药友，比什么都香。"',npc:[{id:'holy-rosa',relationship:'伙伴',affinity:8}],arc:{phase:1},setFlags:['npc-rosa-friend'],flag:'story:npc-rosa'},
    {id:'c',label:'只要那株薄荷',detail:'1日',days:1,follow:'你收下薄荷苗，却推说事务繁忙，不便常来。罗莎眼里的光暗了暗，仍笑着摆手："园子随时为你开着。"',npc:[{id:'holy-rosa',affinity:-4}],arc:{phase:1},setFlags:['npc-rosa-keep'],flag:'story:npc-rosa'},
  ],
  flags:['npc-rosa-lover','npc-rosa-friend','npc-rosa-keep'],
},
{ // 苔丝 · 村口药摊（伙伴）
  id:'npc-tess',arcId:'npc',phase:1,kindName:'关系 · 苔丝',
  title:'村口药摊',
  premise:`苔桥村的市集日，苔丝的药摊前围了一圈人——不是买药，是听她讲"根室里那扇门"的故事。故事讲到一半，她瞥见你，声音忽然顿了顿，接着若无其事地讲完了结尾。

散摊后，她攥着一把晾干的薄荷追到村口，塞进你手里："村里人都在传，说你是敢进林子、敢开门的人。我不懂那些，我只知道——你救过莉亚的命，也治过猎户的烧。"

她搓着围裙角，声音低下来："往后你进林子，缺药、缺向导、缺个识草药的伴，来找我。苔桥村的人，记得恩。"`,
  condition:s=>s.region===5&&!arcSeen(s,'npc','npc-tess')&&(s.worldStory?.npcs?.['mist-tess']?.affinity??0)>=60,
  choices:[
    {id:'a',label:'结为村中知己',detail:'1日 · 关系深化',days:1,follow:'你收下薄荷，郑重应下这份交情。此后苔桥村的药摊，总给你留一捆新采的草药。苔丝说："苔桥村的风，认你。"',npc:[{id:'mist-tess',relationship:'伙伴',memory:'玩家与苔丝结为知己',affinity:10,trust:8}],arc:{phase:1},setFlags:['npc-tess-friend'],flag:'story:npc-tess'},
    {id:'b',label:'请她做采药向导',detail:'2日 · 生存考验',days:2,skill:'生存',difficulty:18,reward:250,follow:'你请她做采药向导，进林采了三日药。苔丝一路教你认菌脉、辨药性，回村时腰间的药篓满得晃荡："跟你进林子，胆子都大了。"',npc:[{id:'mist-tess',trust:10,affinity:6}],arc:{phase:1,knowledge:6},setFlags:['npc-tess-guide'],flag:'story:npc-tess'},
    {id:'c',label:'只收下薄荷',detail:'1日',days:1,follow:'你收下薄荷道了谢，说路还长、后会有期。苔丝点头，转身时又补了一句："药摊给你留着位置，什么时候都算数。"',npc:[{id:'mist-tess',affinity:4}],arc:{phase:1},setFlags:['npc-tess-greet'],flag:'story:npc-tess'},
  ],
  flags:['npc-tess-friend','npc-tess-guide','npc-tess-greet'],
},
{ // 艾琳·雾语 · 守林人的约定（伙伴/导师）
  id:'npc-elin',arcId:'npc',phase:1,kindName:'关系 · 艾琳·雾语',
  title:'守林人的约定',
  premise:`暮林黄昏，艾琳·雾语站在灰烬堡遗址的断墙边，手里握着一卷发脆的旧地图。她没回头，声音却比平时温和了几分："守望者世代守着这片林子，守的不只是树，还有地底下那些不该醒的东西。"

她展开地图，指着一处被朱砂圈过的记号："碎冠之夜后，守望者封了七扇门。我接任时，只剩三扇还封着——其余的，早被岁月和人心打开了。"

她合上地图，认真看着你："你见过门，也开过门。你若愿意，守望者的路为你开着——不是当我的属下，是当这片林子的朋友。"`,
  condition:s=>s.region===5&&!arcSeen(s,'npc','npc-elin')&&(s.worldStory?.npcs?.['mist-elin']?.trust??0)>=55,
  choices:[
    {id:'a',label:'与守望者结盟',detail:'1日 · 关系深化',days:1,follow:'你接下守林人的松脂灯，立下与森林的约定。艾琳难得地笑了笑："林子的门，从此为你留一盏灯。"',npc:[{id:'mist-elin',relationship:'伙伴',memory:'玩家与守望者立约',trust:10,affinity:8}],arc:{phase:1},setFlags:['npc-elin-pact'],flag:'story:npc-elin'},
    {id:'b',label:'跟她学识林',detail:'3日 · 生存/占卜考验',days:3,skill:'生存',difficulty:20,reward:300,follow:'你随她学了三天识林之术：看苔痕、听鸟语、辨兽径。艾琳教得耐心，末了递给你一截刻着符文的木牌："林子认这牌子，也认你。"',npc:[{id:'mist-elin',relationship:'导师',trust:10,affinity:6}],arc:{phase:1,knowledge:10},setFlags:['npc-elin-learn'],flag:'story:npc-elin'},
    {id:'c',label:'只记下地图',detail:'1日',days:1,follow:'你谢过她，只抄了那卷地图的记号。艾琳没有挽留，只是补了一句："门开的时候，林子会记得谁帮过它。"',npc:[{id:'mist-elin',affinity:4}],arc:{phase:1},setFlags:['npc-elin-map'],flag:'story:npc-elin'},
  ],
  flags:['npc-elin-pact','npc-elin-learn','npc-elin-map'],
},
{ // 摩尔 · 公会的筹码（竞争者/伙伴）
  id:'npc-moore',arcId:'npc',phase:1,kindName:'关系 · 摩尔',
  title:'公会的筹码',
  premise:`灰烬堡营地的一顶帐篷里，摩尔·摩尔把一枚铸着药剂师公会纹章的筹码在指间转了个圈，笑吟吟地看着你："你在根室里带回来的东西，让公会在朝圣路病人面前腰杆硬了不少。会长我记你的好。"

他把筹码弹到你面前："公会缺一个能在林子里来去自如、又肯替公会说话的人。你若接，往后药材收购、遗迹材料，公会给你最优价——当然，公会要的货，你也得优先。"

筹码在桌面上打转，银光一闪一闪。摩尔的眼里，精明和试探各占一半。`,
  condition:s=>s.region===5&&!arcSeen(s,'npc','npc-moore')&&(s.worldStory?.npcs?.['mist-moore']?.interest??0)>=50,
  choices:[
    {id:'a',label:'接下公会筹码',detail:'1日 · 关系深化 · 收益',days:1,reward:300,follow:'你收下筹码，与公会立下优先供货之约。摩尔笑得眼角堆起褶子："聪明人。公会这艘船，载得动你。"',npc:[{id:'mist-moore',relationship:'伙伴',memory:'玩家与药剂师公会结约',trust:10,interest:8}],arc:{phase:1},setFlags:['npc-moore-partner'],flag:'story:npc-moore'},
    {id:'b',label:'与他谈成对赌契约',detail:'2日 · 贸易考验',days:2,skill:'贸易',difficulty:18,reward:500,follow:'你没接筹码，却与他立下对赌契：公会按市价收药材，你按产量分成。摩尔眯眼看了你半天，忽地笑了："行，跟你赌，赌得起。"',npc:[{id:'mist-moore',trust:6,interest:12}],arc:{phase:1},setFlags:['npc-moore-rival'],flag:'story:npc-moore'},
    {id:'c',label:'婉拒只做散客',detail:'1日',days:1,follow:'你把筹码推回去，说买卖照旧、交情另算。摩尔也不恼，把筹码收回袖中："散客有散客的价。你想好了，随时来找会长。"',npc:[{id:'mist-moore',interest:4}],arc:{phase:1},setFlags:['npc-moore-standoff'],flag:'story:npc-moore'},
  ],
  flags:['npc-moore-partner','npc-moore-rival','npc-moore-standoff'],
},
// ============================================================
// 碎冠之夜 · 跨区主线（§2 共同历史 · 终局汇合）
// 任一地区均可触发；进度由六条地区线的完成度决定
// ============================================================
{
  id:'crown-1',arcId:'crown-night',phase:1,kindName:'剧情 · 碎冠之夜',
  title:'碎冠的传闻',
  premise:`这半年，你在各地的见闻像散落的拼图：洛恩旧税册里夹着的密道字样、卡斯蒂亚边境的旧星庭鹰爪铁印、北境冻土里的冰纹徽记、阿尔玛沉船里的"第七席"银币、圣辉老井底的白烛铜徽、暮林根室里的门后名字——六件东西，六个方向，却都指向同一年：碎冠之夜。

这天傍晚，一个披着旧斗篷的旅人拦住了你，从怀里掏出一枚被砸裂的王冠碎片："有人出大价钱，收这个。有人出更大的价钱，打听它在哪。"

他压低声音："六个地方，六条线，都在找旧星庭的东西。你若知道些什么，往王都地下走一趟——那儿有个地方，能把这些碎片拼起来。"`,
  condition:s=>!arcSeen(s,'crown-night','crown-1')&&crownProgress(s)>=2,
  choices:[
    {id:'a',label:'追查碎片来历',detail:'3日 · 占卜/识字考验',days:3,skill:'占卜',difficulty:24,reward:400,follow:'你顺着旅人的话头追查那枚王冠碎片，在当铺与旧货行的账本里摸到一条暗线——有人正在四处收购碎冠之夜的遗物。',arc:{phase:1,knowledge:12},setFlags:['crown-probe'],flag:'story:crown-1'},
    {id:'b',label:'把消息卖给商路同盟',detail:'1日 · 12银',days:1,reward:1200,follow:'你把这桩传闻卖给了琥珀商路同盟的密使。银票到手，可你也知道——从今夜起，会有很多双眼睛盯着你手里的线索。',arc:{phase:1,danger:10},setFlags:['crown-sell'],flag:'story:crown-1'},
    {id:'c',label:'记下不提',detail:'1日',days:1,follow:'你谢绝了旅人，却把六件遗物的名字记进了随身笔记。有些东西，知道的人越少，越安全——也越危险。',arc:{phase:1,knowledge:4},setFlags:['crown-silent'],flag:'story:crown-1'},
  ],
  flags:['crown-probe','crown-sell','crown-silent'],
},
{
  id:'crown-2',arcId:'crown-night',phase:2,kindName:'剧情 · 碎冠之夜',
  title:'旧星庭的遗址',
  premise:`王都地下，果然有一扇被苔藓和砖石封死的旧门——门楣上刻着旧星庭的纹章，与你在六地见过的六件遗物如出一辙。门缝里渗出的风，带着一丝极淡的以太气息，像暮林根室里那股味道，又老得多。

你请来的工匠撬开第一层砖，露出门后一条向下的石阶。阶上积着厚厚的灰，只有一行脚印——很新，像是前几天有人走过。

旅人不知何时出现在你身后，声音很轻："旧星庭把最重要的东西，锁在了六地之下。这里，是它的钥匙孔。下不下，你说了算。"`,
  condition:s=>!arcSeen(s,'crown-night','crown-2')&&(arcOf(s,'crown-night').flags['crown-probe']||arcOf(s,'crown-night').flags['crown-sell']||arcOf(s,'crown-night').flags['crown-silent'])&&crownProgress(s)>=3,
  deadline:{key:'crown-site',days:20,onExpire:(s,a)=>{
    const ch:string[]=[];
    ch.push('旧星庭遗址被另一支势力捷足先登，线索中断，一年内再难汇合');
    a.knowledge=Math.max(0,a.knowledge-15);a.danger=Math.min(100,a.danger+10);
    return ch;
  }},
  choices:[
    {id:'a',label:'亲自深入遗址',detail:'4日 · 潜行/元素考验 · 极险',days:4,skill:'潜行',difficulty:30,reward:600,item:'古代碎片',hurt:10,follow:'你带足火把与绳钩，独自走下石阶。遗址深处，六件遗物的纹样在墙上拼成一幅完整的星图——星图的中央，是一顶裂开的王冠。',arc:{phase:2,knowledge:25,danger:8},setFlags:['crown-enter'],flag:'story:crown-2'},
    {id:'b',label:'委托学者考证',detail:'3日 · 8银 · 识字',days:3,cost:800,skill:'识字',difficulty:22,reward:400,follow:'你把石阶下的拓片交给王都的旧学者考据。半月后他送来一卷长文：旧星庭的"第七席"，负责保管六地的遗产——而遗产的钥匙，被拆成了六份，埋在六地。',arc:{phase:2,knowledge:20},setFlags:['crown-scholar'],flag:'story:crown-2'},
    {id:'c',label:'通知守望者封存',detail:'2日 · 信任',days:2,follow:'你请灰枝守望者的人连夜封死旧门，不让任何人再靠近。艾琳·雾语收到信后只回了一句话："封得住门，封不住人心。你保重。"',npc:[{id:'mist-elin',trust:8}],arc:{phase:2,danger:-12,knowledge:5},setFlags:['crown-watch'],flag:'story:crown-2'},
  ],
  flags:['crown-enter','crown-scholar','crown-watch'],
},
{
  id:'crown-3',arcId:'crown-night',phase:3,kindName:'剧情 · 碎冠之夜',
  title:'碎冠之夜',
  premise:`遗址最深处的石室里，六块遗物拼成的星图在你眼前缓缓转动。以太的光辉从星图中央溢出，映亮了满墙的壁画——那画上，一顶王冠从高处坠落，碎成六瓣，落向六个方向。

壁画下方，刻着一行旧星庭的文字，你请的学者译了出来："王冠碎时，六地各执一瓣。待六瓣重聚，星庭之名，将再临人间——或永埋地下。"

你忽然明白：碎冠之夜不是一场灾难的结束，而是一场漫长选择的开始。六地的纷争、六件遗物、六条线索——它们都在等你，做出那个旧星庭没有做完的决定。`,
  condition:s=>!arcSeen(s,'crown-night','crown-3')&&(arcOf(s,'crown-night').flags['crown-enter']||arcOf(s,'crown-night').flags['crown-scholar']||arcOf(s,'crown-night').flags['crown-watch'])&&crownProgress(s)>=4,
  choices:[
    {id:'a',label:'公开碎冠真相',detail:'2日 · 声望大涨',days:2,fame:16,follow:'你把六瓣遗物与星图的拓本公之于众，向六地发出"共议旧星庭遗产"的文书。消息传遍大陆那天，有人欢呼，有人沉默——旧星庭的名字，第一次不再是禁忌。',arc:{phase:3,knowledge:30,dominantFaction:'旧星庭真相会'},setFlags:['crown-truth'],flag:'story:crown-3'},
    {id:'b',label:'封存全部遗物',detail:'2日 · 降低风险',days:2,follow:'你把六瓣遗物重新埋回六地，将星图焚毁。离开遗址时，那扇旧门在你身后轰然合拢——你选择让碎冠之夜真正成为历史。',arc:{phase:3,danger:-20,knowledge:10,dominantFaction:'灰枝守望者'},setFlags:['crown-seal'],flag:'story:crown-3'},
    {id:'c',label:'写入家族记忆',detail:'1日 · 声望 · 传承',days:1,fame:8,follow:'你把星图拓本、六件遗物的下落和这趟旅程的见闻，一笔一笔记进家中的密册。若有一日，你的血脉与后人翻开它，会知道这片大陆最深处的秘密。',arc:{phase:3,knowledge:20,dominantFaction:'旧星庭遗族'},setFlags:['crown-heirloom'],flag:'story:crown-3'},
  ],
  flags:['crown-truth','crown-seal','crown-heirloom'],
},
];
