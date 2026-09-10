export interface WorldStreet{name:string,tier:string}
export interface WorldNotable{name:string,role:string}
export interface WorldCity{id:string,name:string,capital?:boolean,pop:number,prosperity:number,economy:string,notable:WorldNotable[],streets:WorldStreet[]}
export interface WorldNation{id:number,key:string,name:string,capital:string,town:string,desc:string,cities:WorldCity[]}
export const world:WorldNation[]=[
 {id:0,key:'loen',name:'洛恩王国',capital:'金雀城',town:'灰河镇',desc:'麦田延伸至城堡脚下。行会、骑士与古老家族在这里交织。河流带来丰收，也将远方的消息带入城镇。',
  cities:[
   {id:'loen-0',name:'金雀城',capital:true,pop:120000,prosperity:85,economy:'王室年金、农业税赋与行会贸易共同支撑王都。宫廷采购是最大的订单来源，麦价稳定。',
    notable:[{name:'阿尔德里克三世',role:'国王'},{name:'艾莉安娜',role:'王后'},{name:'加雷斯',role:'王储 · 金雀骑士团团长'},{name:'赛门·霍姆',role:'王都税务官'}],
    streets:[{name:'王冠大道',tier:'贵族区'},{name:'金雀广场',tier:'商区'},{name:'磨坊巷',tier:'平民区'}]},
   {id:'loen-1',name:'灰河镇',pop:8000,prosperity:55,economy:'河运码头带动粮食与木料交易，行会学徒众多，工坊林立。',
    notable:[{name:'赫尔曼·灰河',role:'镇长'},{name:'贝拉',role:'灰河行会会长'}],
    streets:[{name:'码头街',tier:'商区'},{name:'工匠巷',tier:'工坊区'},{name:'麦田边',tier:'平民区'}]},
   {id:'loen-2',name:'麦穗渡',pop:5000,prosperity:60,economy:'河谷粮仓，磨坊与粮仓沿河排列，秋收时节商队络绎不绝。',
    notable:[{name:'欧文·谷穗',role:'粮官'},{name:'托马辛',role:'磨坊主'}],
    streets:[{name:'渡口路',tier:'商区'},{name:'磨坊街',tier:'工坊区'}]},
   {id:'loen-3',name:'石桥堡',pop:3000,prosperity:45,economy:'军事堡镇，驻军消费带动铁匠与酒馆生意，兼收过桥税。',
    notable:[{name:'塞德里克爵士',role:'堡主'},{name:'老马丁',role:'军需官'}],
    streets:[{name:'堡门街',tier:'平民区'},{name:'营房巷',tier:'工坊区'}]}
  ]},
 {id:1,key:'castia',name:'卡斯蒂亚帝国',capital:'帝都瓦伦',town:'瓦伦城',desc:'军团守望石砌大道，帝都的高塔投下漫长阴影。功绩、税籍和推荐信，决定许多大门是否向你敞开。',
  cities:[
   {id:'castia-0',name:'帝都瓦伦',capital:true,pop:250000,prosperity:90,economy:'帝国心脏，军团军需、国库拨款与各行会总部汇聚。官职与军阶是最大的上升通道。',
    notable:[{name:'奥古斯都四世',role:'皇帝'},{name:'维罗妮卡',role:'皇后'},{name:'卢修斯·科尔',role:'首席大臣'},{name:'瓦里安',role:'大元帅'}],
    streets:[{name:'凯旋大道',tier:'贵族区'},{name:'军团街',tier:'军务区'},{name:'铸币坊街',tier:'商区'},{name:'贫民桥下',tier:'贫民区'}]},
   {id:'castia-1',name:'铁脊城',pop:60000,prosperity:70,economy:'帝国铸甲重镇，铁矿山脉环绕，军工作坊昼夜不休。',
    notable:[{name:'格里高利',role:'城主'},{name:'维塔·铁砧',role:'铁匠行会会长'}],
    streets:[{name:'铁匠大街',tier:'工坊区'},{name:'矿工巷',tier:'平民区'}]},
   {id:'castia-2',name:'鹰嘴堡',pop:20000,prosperity:50,economy:'边境要塞，警戒山隘。军需补给与驿站生意构成主要经济。',
    notable:[{name:'卡修斯',role:'守备官'},{name:'伊莲娜',role:'驿站主'}],
    streets:[{name:'隘口街',tier:'军务区'},{name:'驿站巷',tier:'平民区'}]},
   {id:'castia-3',name:'法令镇',pop:40000,prosperity:65,economy:'行政重镇，法院、税署与书记行会集中于此，文书业务繁忙。',
    notable:[{name:'塞尔吉乌斯',role:'总督'},{name:'克劳迪娅',role:'首席书记官'}],
    streets:[{name:'法院街',tier:'商区'},{name:'抄录巷',tier:'平民区'}]}
  ]},
 {id:2,key:'north',name:'北境诸领',capital:'霜松堡',town:'霜松堡',desc:'漫长冬季考验每一户人家。猎人穿过针叶林，领主在炉火前交换盟誓，储粮和朋友同样珍贵。',
  cities:[
   {id:'north-0',name:'霜松堡',capital:true,pop:30000,prosperity:60,economy:'诸领首府，盟誓大会的召开地。毛皮、木材与铁矿在此交易，冬储是头等大事。',
    notable:[{name:'布兰恩·白霜',role:'大领主'},{name:'罗德里克',role:'长子 · 北境守护继承人'},{name:'希尔达',role:'议会女长老'}],
    streets:[{name:'长厅街',tier:'贵族区'},{name:'炉火市集',tier:'商区'},{name:'储窖巷',tier:'平民区'}]},
   {id:'north-1',name:'冻溪镇',pop:6000,prosperity:45,economy:'渔猎小镇，冻溪盛产鳟鱼与貂皮，冬季以狩猎和皮毛贸易为主。',
    notable:[{name:'艾琳·冻溪',role:'族长'},{name:'奥拉夫',role:'狩猎队长'}],
    streets:[{name:'冻溪岸',tier:'平民区'},{name:'皮毛仓',tier:'商区'}]},
   {id:'north-2',name:'狼喉隘',pop:2000,prosperity:35,economy:'隘口哨站，冬狼出没的险地。旅店、马厩与戍卫营构成全部营生。',
    notable:[{name:'哈肯',role:'戍卫队长'}],
    streets:[{name:'隘口街',tier:'军务区'}]},
   {id:'north-3',name:'林歌村',pop:1500,prosperity:40,economy:'针叶林中的猎户聚落，以鹿肉、松脂和药草与外界交换。',
    notable:[{name:'斯文',role:'长老'}],
    streets:[{name:'林间道',tier:'平民区'}]}
  ]},
 {id:3,key:'alma',name:'阿尔玛自由城邦',capital:'白帆港',town:'白帆港',desc:'帆影涌入港湾，市集用不同语言讨价还价。自由有价，而每一份契约都是新的起点。',
  cities:[
   {id:'alma-0',name:'白帆港',capital:true,pop:180000,prosperity:88,economy:'自由城邦首府，万国商船停泊之地。汇兑、保险与大宗贸易都在港口的交易所达成。',
    notable:[{name:'梅拉·沃德',role:'首席执政官'},{name:'十二人议会',role:'城邦议会'},{name:'卡洛·帆',role:'港务长'},{name:'伊索',role:'汇兑商会会长'}],
    streets:[{name:'水手街',tier:'港区'},{name:'交易所广场',tier:'商区'},{name:'仓库巷',tier:'平民区'},{name:'灯塔崖',tier:'贵族区'}]},
   {id:'alma-1',name:'琥珀湾',pop:50000,prosperity:78,economy:'造船与染色业兴盛，琥珀贸易让工匠和船主富足。',
    notable:[{name:'埃德加',role:'商会会长'},{name:'丽迪雅',role:'船坞主'}],
    streets:[{name:'船坞街',tier:'工坊区'},{name:'染坊巷',tier:'商区'}]},
   {id:'alma-2',name:'盐沼镇',pop:20000,prosperity:62,economy:'晒盐场与渔场遍布海滨，盐税是城邦重要财源。',
    notable:[{name:'多萝西娅',role:'盐务官'}],
    streets:[{name:'盐场路',tier:'工坊区'},{name:'渔市',tier:'平民区'}]},
   {id:'alma-3',name:'桅杆村',pop:8000,prosperity:50,economy:'造船村落，出产良木桅杆与缆绳，船匠技艺世代相传。',
    notable:[{name:'本诺',role:'船匠头'}],
    streets:[{name:'桅杆场',tier:'工坊区'}]}
  ]},
 {id:4,key:'holy',name:'圣辉教国',capital:'晨钟城',town:'晨钟城',desc:'钟声划分修院的一天。医者、学者和朝圣者走过石阶，信仰之中也有不同的答案。',
  cities:[
   {id:'holy-0',name:'晨钟城',capital:true,pop:90000,prosperity:72,economy:'教国中枢，大教堂与神学院坐落于此。朝圣奉献、修院田产与藏书抄本构成主要经济。',
    notable:[{name:'塞莱斯廷七世',role:'教宗'},{name:'奥古斯丁',role:'枢机主教'},{name:'克拉拉',role:'圣辉大修院院长'}],
    streets:[{name:'圣辉大道',tier:'宗教区'},{name:'钟楼街',tier:'商区'},{name:'修士巷',tier:'平民区'}]},
   {id:'holy-1',name:'烛影镇',pop:30000,prosperity:58,economy:'制烛与造纸闻名，修院工场雇用了大量镇民。',
    notable:[{name:'玛蒂尔达',role:'修院院长'},{name:'约瑟夫',role:'造纸工场主'}],
    streets:[{name:'烛坊街',tier:'工坊区'},{name:'纸坊巷',tier:'平民区'}]},
   {id:'holy-2',name:'圣泉镇',pop:20000,prosperity:65,economy:'圣泉疗养地，旅舍与药园围绕泉眼展开，病人与朝圣者络绎不绝。',
    notable:[{name:'加布里埃尔',role:'圣泉执事'},{name:'罗莎',role:'药园总管'}],
    streets:[{name:'泉畔街',tier:'商区'},{name:'药园巷',tier:'平民区'}]},
   {id:'holy-3',name:'祈祷山',pop:10000,prosperity:52,economy:'朝圣终点，山顶教堂主持一年一度的祈祷节，山下以接待朝圣者为生。',
    notable:[{name:'西尔维娅',role:'朝圣堂主祭'}],
    streets:[{name:'石阶路',tier:'平民区'}]}
  ]},
 {id:5,key:'mist',name:'暮林边境',capital:'苔桥城',town:'苔桥村',desc:'古老树冠遮蔽遗忘的石碑。人类与精灵的道路在贸易站相遇，林深处仍有未解之事。',
  cities:[
   {id:'mist-0',name:'苔桥城',capital:true,pop:40000,prosperity:55,economy:'边境首府，人类与精灵的贸易枢纽。药草、遗迹古物与魔法材料在此流通。',
    notable:[{name:'艾琳·雾语',role:'守林长'},{name:'瑟兰迪尔',role:'精灵长老'}],
    streets:[{name:'苔桥市集',tier:'商区'},{name:'药草巷',tier:'平民区'},{name:'古物街',tier:'商区'}]},
   {id:'mist-1',name:'苔桥村',pop:5000,prosperity:42,economy:'林缘村落，以药草采集、打猎和守卫森林通道为生。',
    notable:[{name:'洛维',role:'村长'},{name:'苔丝',role:'草药师'}],
    streets:[{name:'村口路',tier:'平民区'}]},
   {id:'mist-2',name:'雾根镇',pop:15000,prosperity:48,economy:'药剂与炼金小镇，雾根蘑菇和月光露是特产，药剂师公会把持配方。',
    notable:[{name:'摩尔',role:'药剂师公会会长'}],
    streets:[{name:'蒸馏坊街',tier:'工坊区'},{name:'菌田巷',tier:'平民区'}]},
   {id:'mist-3',name:'灰烬堡',pop:3000,prosperity:38,economy:'古帝国遗迹旁的小型营地，冒险者与学者在此补给，遗迹守卫维持秩序。',
    notable:[{name:'罗恩',role:'遗迹守卫'}],
    streets:[{name:'营地街',tier:'平民区'}]}
  ]}
];
export const businessTypes=[
 {name:'工坊',skill:'锻造',base:250,cost:5000,desc:'锻造与手工制造，利润稳定'},
 {name:'商铺',skill:'贸易',base:230,cost:4500,desc:'买入卖出，赚取差价'},
 {name:'农场',skill:'生存',base:200,cost:4000,desc:'田地与牲畜，收成看天'},
 {name:'猎屋',skill:'弓术',base:215,cost:3800,desc:'狩猎、皮毛与林产'},
 {name:'医馆',skill:'医术',base:265,cost:5200,desc:'问诊、药剂与护理'},
 {name:'武馆',skill:'剑术',base:275,cost:6000,desc:'武艺教学与护卫委托'},
 {name:'学堂',skill:'识字',base:235,cost:4800,desc:'教书、抄录与文书'},
 {name:'法师塔',skill:'元素',base:310,cost:8000,desc:'研究与施法服务，收益高门槛也高'}
];
export function nationByCity(id:string){return world.find(n=>n.cities.some(c=>c.id===id))||null}
export function cityById(id:string){for(const n of world){const c=n.cities.find(c=>c.id===id);if(c)return c}return null}
export const capitalName=(n:WorldNation)=>n.cities.find(c=>c.capital)?.name||n.capital;
