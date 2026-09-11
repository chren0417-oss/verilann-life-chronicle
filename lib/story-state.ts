// ============================================================
// 维尔兰 · 世界剧情状态层（story-state）
// 依据《维尔兰世界剧情圣经》§4/§5/§11.4 实现
// 负责：可存档的剧情状态类型、默认值、旧档迁移与校验
// 不包含：事件卡定义（region-arcs.ts）、引擎逻辑（story-engine.ts）
// ============================================================
import type {Game} from './game';

// ---- 玩家势力状态（§6.2）----
export type PolityStage = '无'|'产业网络'|'封地'|'城市'|'巨城'|'自治城'|'独立国';

export type PlayerPolityState = {
  stage:PolityStage;
  legitimacy:number;       // 本地居民、母国与外部势力认可度
  influence:number;        // 对商路、军队、情报与舆论的实际影响
  autonomy:number;         // 母国允许的自治程度
  foreignPressure:number;  // 他国、商会、修会施加的压力
  treaties:string[];       // 后续独立或自治后使用
};

// ---- 单条地区弧线状态（§5）----
export type ArcState = {
  id:string;
  phase:number;                       // 0 未开始，1–5 阶段
  tension:number;                     // 冲突压力 0–100
  scarcity:number;                    // 资源紧张 0–100
  danger:number;                      // 地区风险 0–100
  knowledge:number;                   // 真相进度 0–100
  dominantFaction:string|null;
  flags:Record<string,boolean>;
  deadlines:Record<string,number>;    // 名称 -> 游戏日（逾期未处理将推进世界）
  history:string[];                   // 已完成事件 ID
};

// ---- 核心 NPC 状态（§4）----
export const relationshipNames = ['陌生','伙伴','导师','恋人','竞争者','仇人'] as const;
export type Relationship = typeof relationshipNames[number];

export type StoryNpcState = {
  id:string;
  affinity:number;        // 愿不愿意接近与合作
  trust:number;           // 是否交付秘密或风险
  interest:number;        // 利益是否一致，允许为负
  stance:string;          // 对地区冲突的立场
  secretKnown:boolean;    // 秘密是否已解锁
  memories:string[];      // 玩家关键选择的旗标
  relationship:Relationship;
  alive:boolean;
};

export type WorldStoryState = {
  arcs:Record<string,ArcState>;
  npcs:Record<string,StoryNpcState>;
  playerPolity:PlayerPolityState;
};

// ---- 默认值 ----
export const ARCS = [
  'loen-tax','castia-eagle','north-oath','alma-ports','holy-candle','mist-door',
] as const;
export type ArcId = typeof ARCS[number];

const clamp = (x:number,min=0,max=100)=>Math.min(max,Math.max(min,x));

function defaultArc(id:string):ArcState{
  const base:Record<string,Partial<ArcState>> = {
    'loen-tax':    {tension:30,scarcity:25,danger:10,knowledge:0},
    'castia-eagle':{tension:40,scarcity:20,danger:25,knowledge:0},
    'north-oath':  {tension:35,scarcity:40,danger:30,knowledge:0},
    'alma-ports':  {tension:30,scarcity:25,danger:15,knowledge:0},
    'holy-candle': {tension:25,scarcity:15,danger:12,knowledge:0},
    'mist-door':   {tension:20,scarcity:10,danger:15,knowledge:0},
  };
  return {id,phase:0,tension:base[id]?.tension??30,scarcity:base[id]?.scarcity??20,danger:base[id]?.danger??15,knowledge:0,dominantFaction:null,flags:{},deadlines:{},history:[]};
}

export function defaultNpc(id:string):StoryNpcState{
  return {id,affinity:30,trust:10,interest:0,stance:'中立',secretKnown:false,memories:[],relationship:'陌生',alive:true};
}

export function defaultWorldStory():WorldStoryState{
  const arcs:Record<string,ArcState> = {};
  for(const id of ARCS) arcs[id] = defaultArc(id);
  return {
    arcs,
    npcs:{},
    playerPolity:{stage:'无',legitimacy:50,influence:0,autonomy:0,foreignPressure:0,treaties:[]},
  };
}

// ---- 迁移：旧档无 worldStory 时补齐默认 ----
export function normalizeWorldStory(v:any, npcIds:string[]=[]):WorldStoryState{
  const d = defaultWorldStory();
  if(!v || typeof v !== 'object' || Array.isArray(v)) return d;
  const out:WorldStoryState = {
    arcs:d.arcs,
    npcs:d.npcs,
    playerPolity:{...d.playerPolity, ...(v.playerPolity&&typeof v.playerPolity==='object'?v.playerPolity:{})},
  };
  if(v.arcs && typeof v.arcs==='object' && !Array.isArray(v.arcs)){
    const arcs:Record<string,ArcState> = {};
    for(const id of ARCS){
      const a = v.arcs[id];
      if(a && typeof a==='object'){
        arcs[id] = {
          id,
          phase:Number.isFinite(a.phase)?Math.min(5,Math.max(0,a.phase)):d.arcs[id].phase,
          tension:clamp(Number.isFinite(a.tension)?a.tension:d.arcs[id].tension),
          scarcity:clamp(Number.isFinite(a.scarcity)?a.scarcity:d.arcs[id].scarcity),
          danger:clamp(Number.isFinite(a.danger)?a.danger:d.arcs[id].danger),
          knowledge:clamp(Number.isFinite(a.knowledge)?a.knowledge:0),
          dominantFaction:typeof a.dominantFaction==='string'?a.dominantFaction:null,
          flags:a.flags&&typeof a.flags==='object'?{...a.flags}:{},
          deadlines:a.deadlines&&typeof a.deadlines==='object'?{...a.deadlines}:{},
          history:Array.isArray(a.history)?a.history.filter((x:any)=>typeof x==='string'):[],
        };
      } else arcs[id] = d.arcs[id];
    }
    // 保留非标准弧线（如碎冠之夜 crown-night）：结构与 ArcState 相同
    for(const k of Object.keys(v.arcs)){
      if(ARCS.includes(k as any)) continue;
      const a = v.arcs[k];
      if(a && typeof a==='object' && !Array.isArray(a) && Number.isInteger(a.phase) && a.phase>=0 && a.phase<=5){
        arcs[k] = {
          id:k,
          phase:a.phase,
          tension:clamp(Number.isFinite(a.tension)?a.tension:30),
          scarcity:clamp(Number.isFinite(a.scarcity)?a.scarcity:20),
          danger:clamp(Number.isFinite(a.danger)?a.danger:15),
          knowledge:clamp(Number.isFinite(a.knowledge)?a.knowledge:0),
          dominantFaction:typeof a.dominantFaction==='string'?a.dominantFaction:null,
          flags:a.flags&&typeof a.flags==='object'?{...a.flags}:{},
          deadlines:a.deadlines&&typeof a.deadlines==='object'?{...a.deadlines}:{},
          history:Array.isArray(a.history)?a.history.filter((x:any)=>typeof x==='string'):[],
        };
      }
    }
    out.arcs = arcs;
  }
  if(v.npcs && typeof v.npcs==='object' && !Array.isArray(v.npcs)){
    const npcs:Record<string,StoryNpcState> = {};
    for(const id of npcIds){
      const n = v.npcs[id];
      if(n && typeof n==='object'){
        npcs[id] = {
          id,
          affinity:clamp(Number.isFinite(n.affinity)?n.affinity:30),
          trust:clamp(Number.isFinite(n.trust)?n.trust:10),
          interest:clamp(Number.isFinite(n.interest)?n.interest:0,-100,100),
          stance:typeof n.stance==='string'?n.stance:'中立',
          secretKnown:!!n.secretKnown,
          memories:Array.isArray(n.memories)?n.memories.filter((x:any)=>typeof x==='string'):[],
          relationship:relationshipNames.includes(n.relationship)?n.relationship:'陌生',
          alive:n.alive===undefined?true:!!n.alive,
        };
      } else npcs[id] = d.npcs[id]||defaultNpc(id);
    }
    out.npcs = npcs;
  }
  return out;
}

// ---- 校验（validSave 使用；旧档允许缺省）----
export function validWorldStory(v:any, npcIds:string[]=[]):boolean{
  if(v===undefined) return true;
  if(!v || typeof v!=='object' || Array.isArray(v)) return false;
  if(!v.arcs || typeof v.arcs!=='object' || Array.isArray(v.arcs)) return false;
  for(const id of ARCS){
    const a = v.arcs[id];
    if(!a || typeof a!=='object') return false;
    if(!Number.isInteger(a.phase)||a.phase<0||a.phase>5) return false;
    for(const k of ['tension','scarcity','danger','knowledge'])
      if(!Number.isFinite(a[k])||a[k]<0||a[k]>100) return false;
    if(!(typeof a.flags==='object'&&!Array.isArray(a.flags))) return false;
    if(!(typeof a.deadlines==='object'&&!Array.isArray(a.deadlines))) return false;
    if(!Array.isArray(a.history)||!a.history.every((x:any)=>typeof x==='string')) return false;
  }
  if(v.npcs && typeof v.npcs==='object' && !Array.isArray(v.npcs)){
    for(const id of npcIds){
      const n = v.npcs[id];
      if(!n || typeof n!=='object') continue; // 允许缺个别（迁移会补）
      for(const k of ['affinity','trust','interest'])
        if(!Number.isFinite(n[k])) return false;
      if(!relationshipNames.includes(n.relationship)) return false;
      if(typeof n.alive!=='boolean') return false;
    }
  }
  // 额外弧线（如 crown-night）若存在也必须结构合法
  if(v.arcs && typeof v.arcs==='object' && !Array.isArray(v.arcs)){
    for(const k of Object.keys(v.arcs)){
      if(ARCS.includes(k as any)) continue;
      const a = v.arcs[k];
      if(!a || typeof a!=='object' || Array.isArray(a)) return false;
      if(!Number.isInteger(a.phase)||a.phase<0||a.phase>5) return false;
      for(const f of ['tension','scarcity','danger','knowledge'])
        if(!Number.isFinite(a[f])||a[f]<0||a[f]>100) return false;
      if(!(typeof a.flags==='object'&&!Array.isArray(a.flags))) return false;
      if(!(typeof a.deadlines==='object'&&!Array.isArray(a.deadlines))) return false;
      if(!Array.isArray(a.history)||!a.history.every((x:any)=>typeof x==='string')) return false;
    }
  }
  return true;
}

// ---- 便捷读取 ----
export function arcOf(s:Game,id:string):ArcState{
  const ws = s.worldStory;
  if(!ws || !ws.arcs || !ws.arcs[id]) return defaultArc(id);
  return ws.arcs[id];
}
export function npcOf(s:Game,id:string):StoryNpcState|null{
  const ws = s.worldStory;
  if(!ws || !ws.npcs || !ws.npcs[id]) return null;
  return ws.npcs[id];
}
export function hasArcFlag(s:Game,id:string,flag:string):boolean{
  return !!arcOf(s,id).flags[flag];
}
export function arcSeen(s:Game,id:string,eventId:string):boolean{
  return arcOf(s,id).history.includes(eventId);
}
export function withArc(s:Game,id:string,fn:(a:ArcState)=>void):void{
  const ws = s.worldStory; if(!ws) return;
  if(!ws.arcs[id]) ws.arcs[id] = defaultArc(id);
  fn(ws.arcs[id]);
}
export function withNpc(s:Game,id:string,fn:(n:StoryNpcState)=>void):void{
  const ws = s.worldStory; if(!ws) return;
  if(!ws.npcs[id]) ws.npcs[id] = defaultNpc(id);
  fn(ws.npcs[id]);
}
