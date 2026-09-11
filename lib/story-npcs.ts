// ============================================================
// 维尔兰 · 核心 NPC 定义（story-npcs）
// 依据《维尔兰世界剧情圣经》§3 各地区关键 NPC + §4 关系线规则
// 每个 NPC：立场、秘密、记忆；关系只能由长期行动推动
// ============================================================
import type {Game} from './game';
import {defaultNpc,withNpc,type StoryNpcState} from './story-state';

export type NpcDef = {
  id:string;
  name:string;
  region:number;             // 所在地区 0-5
  role:string;
  faction:string;
  stance:string;             // 对地区冲突的立场
  secret:string;             // 未解锁时只显示模糊传闻
  personality:string;        // 关系线行为提示
};

export const storyNpcDefs:NpcDef[] = [
  // ---- 洛恩王国 · 河谷税册 ----
  {id:'loen-hermann',name:'赫尔曼·灰河',region:0,role:'灰河镇长',faction:'洛恩地方官府',stance:'求稳——不愿见税改动乱，也不愿行会做大',secret:'曾替贵族隐瞒过三年前的征粮克扣，为的是保住镇子',personality:'圆滑、怕担责；信任靠守约，厌恶惹事'},
  {id:'loen-bella',name:'贝拉',region:0,role:'灰河行会会长',faction:'灰河行会',stance:'求变——主张查清税册、抵制囤粮',secret:'行会账上有一笔"防火钱"，实际流向边境民兵，她说不清来历',personality:'精明果决；利益一致时极其可靠，被背叛后绝不原谅'},
  {id:'loen-simon',name:'赛门·霍姆',region:0,role:'王都税务官',faction:'王室税署',stance:'奉命加征，内心摇摆',secret:'他女儿患了罕见病，正求医于圣辉教国——这是他最大的软肋',personality:'专业但焦虑；若能帮他保住女儿，他会还以实情'},
  // ---- 卡斯蒂亚帝国 · 鹰旗与铁印 ----
  {id:'castia-varian',name:'瓦里安',region:1,role:'帝国大元帅',faction:'帝国军务厅',stance:'真心守国，但容忍牺牲',secret:'他知道十年前"碎冠之夜"的兵器曾流入边境黑市，始终追查无果',personality:'威严寡言；敬重勇武与担当，蔑视投机'},
  {id:'castia-lucius',name:'卢修斯·科尔',region:1,role:'首席大臣',faction:'帝国朝廷',stance:'维持平衡——压制军功贵族，也安抚前线',secret:'他私通阿尔玛商会放贷，用于平衡帝国财政',personality:'深不可测；利益网络是他的真身，承诺只是筹码'},
  {id:'castia-vita',name:'维塔·铁砧',region:1,role:'铁匠行会会长',faction:'帝国军工业',stance:'依赖军单，反对停战',secret:'她在军工作坊里悄悄留了一条民用铁器的暗线，以备战事收缩',personality:'爽快、务实；手艺认第一，价格第二'},
  {id:'castia-elena',name:'伊莲娜',region:1,role:'鹰嘴堡驿站主',faction:'边境驿路',stance:'中立——消息即生计',secret:'她保存着一本边境过境登记簿，记载了"碎冠之夜"后所有异常商队',personality:'消息灵通，爱做顺水人情；能换到情报时绝不小气'},
  // ---- 北境诸领 · 长冬盟誓 ----
  {id:'north-bran',name:'布兰恩·白霜',region:2,role:'北境大领主',faction:'北境诸领议会',stance:'保境安民，强硬对外',secret:'他的长子罗德里克暗中与南方的商人谈判出售狼喉隘的采矿权',personality:'厚重如山；看重承诺与实力，也看重猎物与酒'},
  {id:'north-hilda',name:'希尔达',region:2,role:'议会女长老',faction:'北境议会',stance:'主张储粮与迁徙而非硬拼',secret:'她年轻时在暮林边境见过"会发光的树根"，是少数还相信旧星庭传说的人',personality:'睿智温和；交换知识时最慷慨'},
  {id:'north-elin',name:'艾琳·冻溪',region:2,role:'冻溪族长',faction:'冻溪氏族',stance:'支持封锁狼喉隘，保护冬猎地',secret:'冻溪的粮仓实际缺了三成，她瞒着议会',personality:'倔强护短；受过恩惠会记一辈子'},
  // ---- 阿尔玛自由城邦 · 十二席议会 ----
  {id:'alma-maira',name:'梅拉·沃德',region:3,role:'首席执政官',faction:'十二人议会',stance:'稳住港口的信用与债券',secret:'执政官任期内有一笔沉船保险赔付被人为做高，签字的是她前任',personality:'克制冷静；契约与信用高于一切，但也会为城邦利益说谎'},
  {id:'alma-kalo',name:'卡洛·帆',region:3,role:'港务长',faction:'白帆港港务',stance:'反对议会把损失转嫁给船坞工人',secret:'他掌握走私船的真实航线，多年睁一只眼闭一只眼',personality:'市井气重，讲义气；帮过的人他会罩着'},
  {id:'alma-iso',name:'伊索',region:3,role:'汇兑商会会长',faction:'琥珀商路同盟',stance:'资本逐利，谁赢帮谁',secret:'商会的坏账清单里有一笔帝国朝廷的贷款，利滚利已成天文数字',personality:'笑面虎；只要账目清晰，什么都敢谈'},
  // ---- 圣辉教国 · 白烛与灰书 ----
  {id:'holy-clara',name:'克拉拉',region:4,role:'圣辉大修院院长',faction:'白烛修会',stance:'封锁与治疗并行，反对焚书',secret:'她私下抄录过"灰书"残页，藏于修院地窖',personality:'慈悲而务实；最在意病人的命，其次才是教义'},
  {id:'holy-augustine',name:'奥古斯丁',region:4,role:'枢机主教',faction:'教廷枢机团',stance:'主张焚毁以太资料、审查学者',secret:'他本人年轻时曾因研究以太被警告，恐惧源于旧事',personality:'威严、教条；一旦认定你是异端便极难转圜'},
  {id:'holy-rosa',name:'罗莎',region:4,role:'圣泉药园总管',faction:'白烛修会（医疗支）',stance:'支持治疗优先，反感枢机的审查',secret:'圣泉的井水近年有微弱异香，她怀疑与暮林的地脉有关',personality:'耐心细腻；懂药也懂人心，最容易被真话打动'},
  // ---- 暮林边境 · 树根下的门 ----
  {id:'mist-elin',name:'艾琳·雾语',region:5,role:'守林长',faction:'灰枝守望者',stance:'封锁遗迹，守护森林',secret:'守望者内部记录显示，碎冠之夜时曾有守望者主动封印了某扇门',personality:'清冷执着；对森林的感情超过一切'},
  {id:'mist-thrandil',name:'瑟兰迪尔',region:5,role:'精灵长老',faction:'精灵遗民议会',stance:'要求彻底封锁并驱逐外来商队',secret:'他知道树根下那扇门的来历——旧星庭的"以太祭坛"曾在此地',personality:'沉默深邃；活的年岁太长，几乎不为所动，除了族人的安危'},
  {id:'mist-moore',name:'摩尔',region:5,role:'药剂师公会会长',faction:'药剂师公会',stance:'主张有限开采遗迹材料',secret:'他的配方库里缺一味"雾根菌髓"，正与外来商队暗中接洽',personality:'精明生意人；药材利润优先，但仍会为病人让步'},
  {id:'mist-tess',name:'苔丝',region:5,role:'苔桥村草药师',faction:'苔桥村',stance:'只想治好村人的病',secret:'她认得所有雾根蘑菇的成色，也能闻出"失色"的蘑菇来自哪片林子',personality:'热心肠，胆子小；谁对她好她就信谁'},
];

export const storyNpcIds = storyNpcDefs.map(d=>d.id);

// 暮林线专属（失踪采药人，卡2主角）
export const storyNpcExtra = [
  {id:'mist-lydia',name:'莉亚',region:5,role:'苔桥村采药人',faction:'苔桥村',stance:'无立场——只想活着回家',secret:'她曾在雾根林深处见过"会发光的门缝"',personality:'机灵坚韧；被救后对恩人极度忠诚'},
] as NpcDef[];

export const allStoryNpcDefs = [...storyNpcDefs, ...storyNpcExtra];
export const allStoryNpcIds = allStoryNpcDefs.map(d=>d.id);

// 初始化/迁移时注入默认 NPC 状态
export function seedStoryNpcs(ws:{npcs:Record<string,StoryNpcState>}):void{
  for(const d of allStoryNpcDefs){
    if(!ws.npcs[d.id]) ws.npcs[d.id] = defaultNpc(d.id);
  }
}

export function npcName(s:Game,id:string):string{
  const d = allStoryNpcDefs.find(x=>x.id===id);
  return d ? d.name : id;
}

// ---- 关系效果：好感/信任/利益/秘密/关系变化 ----
export type NpcEffect = {
  id:string;
  affinity?:number;
  trust?:number;
  interest?:number;
  secret?:boolean;         // 解锁秘密
  relationship?:StoryNpcState['relationship'];
  memory?:string;
  alive?:boolean;
};
const clamp=(x:number,min=0,max=100)=>Math.min(max,Math.max(min,x));

export function applyNpcEffects(s:Game,effects:NpcEffect[]|undefined,log:(t:string)=>void):void{
  if(!effects) return;
  for(const ef of effects){
    withNpc(s,ef.id,n=>{
      if(ef.alive!==undefined) n.alive = ef.alive;
      if(ef.affinity!==undefined){n.affinity = clamp(n.affinity + ef.affinity);log(npcName(s,ef.id)+'亲近 '+ (ef.affinity>=0?'+':'')+ef.affinity);}
      if(ef.trust!==undefined){n.trust = clamp(n.trust + ef.trust);log(npcName(s,ef.id)+'信任 '+ (ef.trust>=0?'+':'')+ef.trust);}
      if(ef.interest!==undefined){n.interest = clamp(n.interest + ef.interest,-100,100);log(npcName(s,ef.id)+'利益 '+ (ef.interest>=0?'+':'')+ef.interest);}
      if(ef.secret && !n.secretKnown){n.secretKnown = true;log('你得知了'+npcName(s,ef.id)+'的秘密');}
      if(ef.relationship){n.relationship = ef.relationship;log('与'+npcName(s,ef.id)+'的关系：'+ef.relationship);}
      if(ef.memory && !n.memories.includes(ef.memory)) n.memories.push(ef.memory);
    });
  }
}
