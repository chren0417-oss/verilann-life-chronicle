// ============================================================
// 维尔兰 · 故事引擎（story-engine）
// 依据《维尔兰世界剧情圣经》§8/§11.5 实现
// 负责：事件卡编译、选择后的世界结算、截止日期推进、地区自动演化
// 不包含：卡片文本（region-arcs.ts）、存档状态（story-state.ts）
// ============================================================
import type {Event,Game} from './game';
import type {ArcState} from './story-state';
import {arcOf,withArc,withNpc,ARCS} from './story-state';
import {applyNpcEffects} from './story-npcs';
import {storyCards,arcName,type StoryCard} from './region-arcs';

const clamp=(x:number,min=0,max=100)=>Math.min(max,Math.max(min,x));

// ---- 编译：StoryCard -> Event（接入现有事件系统）----
export function compileStoryEvents(cards:StoryCard[]):Event[]{
  return cards.map(c=>({
    id:c.id,
    kind:c.kindName || '剧情 · '+arcName(c.arcId),
    title:c.title,
    text:c.premise,
    condition:c.condition,
    choices:c.choices.map(ch=>({
      label:ch.label,detail:ch.detail,days:ch.days,cost:ch.cost,skill:ch.skill,
      difficulty:ch.difficulty,reward:ch.reward,item:ch.item,fame:ch.fame,hurt:ch.hurt,
      follow:ch.follow,flag:ch.flag,battle:ch.battle,failFollow:ch.failFollow,failFlags:ch.failFlags,
    })),
  }));
}

export function storyCardById(id:string):StoryCard|undefined{
  return storyCards.find(c=>c.id===id);
}

// 该事件是否已因截止过期而收场（过期后不再挂出）
export function storyExpired(s:Game,eventId:string):boolean{
  const card = storyCardById(eventId);
  if(!card) return false;
  return arcOf(s,card.arcId).history.includes(card.id+':expire');
}

// ---- 事件被挂入 s.event 时的钩子：注册截止日期（出现即计时）----
export function onStoryQueued(s:Game,eventId:string):void{
  const card = storyCardById(eventId);
  if(!card || !card.deadline) return;
  withArc(s,card.arcId,a=>{
    if(!(card.deadline!.key in a.deadlines)){
      a.deadlines[card.deadline!.key] = s.day + card.deadline!.days;
    }
  });
}

// ---- 选择结算：应用 NPC/弧线/旗标/截止/死亡（在 perform 现有结算之后调用）----
export function afterStoryChoice(s:Game,card:StoryCard,choiceIdx:number,_success:boolean):string[]{
  const ch = card.choices[choiceIdx];
  if(!ch) return [];
  const changes:string[] = [];
  // 1) NPC 关系
  applyNpcEffects(s,ch.npc,(t:string)=>changes.push(t));
  // 2) 弧线状态
  const arcFx = ch.arc;
  if(arcFx){
    withArc(s,card.arcId,a=>{
      for(const k of ['tension','scarcity','danger','knowledge'] as const){
        if(arcFx[k]!==undefined) a[k] = clamp((a[k]||0)+(arcFx[k] as number));
      }
      if(arcFx.phase!==undefined && a.phase < arcFx.phase) a.phase = arcFx.phase;
      if(arcFx.dominantFaction) a.dominantFaction = arcFx.dominantFaction;
      if(arcFx.tension!==undefined) changes.push('地区压力 '+(arcFx.tension>=0?'+':'')+arcFx.tension);
      if(arcFx.danger!==undefined) changes.push('地区危险 '+(arcFx.danger>=0?'+':'')+arcFx.danger);
      if(arcFx.knowledge!==undefined) changes.push('真相进度 +'+arcFx.knowledge);
      if(arcFx.scarcity!==undefined) changes.push('资源紧张 '+(arcFx.scarcity>=0?'+':'')+arcFx.scarcity);
    });
  }
  // 3) 弧线旗标
  if(ch.setFlags){
    withArc(s,card.arcId,a=>{for(const f of ch.setFlags!) a.flags[f]=true;});
  }
  if(ch.clearFlags){
    withArc(s,card.arcId,a=>{for(const f of ch.clearFlags!) delete a.flags[f];});
  }
  // 4) 截止日期
  if(ch.deadline){
    withArc(s,card.arcId,a=>{ a.deadlines[ch.deadline!.key] = s.day + ch.deadline!.days; });
  }
  if(ch.clearDeadline){
    withArc(s,card.arcId,a=>{ delete a.deadlines[ch.clearDeadline!]; });
  }
  // 5) NPC 死亡
  if(ch.killNpc){
    withNpc(s,ch.killNpc,n=>{ n.alive=false; changes.push(npcLabel(s,ch.killNpc!)+'去世'); });
  }
  // 6) 记录已完成事件
  withArc(s,card.arcId,a=>{
    if(!a.history.includes(card.id)) a.history.push(card.id);
  });
  return changes;
}

function npcLabel(s:Game,id:string):string{
  const d = (s.worldStory?.npcs?.[id]);
  return d ? id : id;
}

// ---- 世界自行推进：截止日期、未处理后果、地区阶段（在 advance 后调用）----
export function advanceWorldStory(s:Game,days:number):string[]{
  const changes:string[] = [];
  const ws = s.worldStory;
  if(!ws) return changes;
  // 1) 截止日期过期结算
  for(const card of storyCards){
    if(!card.deadline) continue;
    const a = ws.arcs[card.arcId];
    if(!a) continue;
    const key = card.deadline.key;
    const due = a.deadlines[key];
    if(due!==undefined && s.day > due){
      delete a.deadlines[key];
      const marker = card.id+':expire';
      if(!a.history.includes(marker)){
        a.history.push(marker);
        if(card.deadline.onExpire) changes.push(...card.deadline.onExpire(s,a));
      }
    }
  }
  // 2) 世界缓慢自行演化：每 30 天，玩家未在场的地区冲突压力缓增
  if(days>=30){
    const n = Math.floor(days/30);
    for(const id of ARCS){
      const a = ws.arcs[id];
      if(!a || id==='mist-door') continue;      // 暮林由事件链驱动
      if(a.phase>0 && a.phase<5){
        a.tension = Math.min(100, a.tension + n*2);
        if(n>=2) a.scarcity = Math.min(100, a.scarcity + n);
        if(n>=4) a.danger = Math.min(100, a.danger + 1);
      }
    }
  }
  return changes;
}

// ---- 地区价格修正因子（供市场/消费接入；§5 后果落地接口）----
export function regionPriceMod(s:Game,regionIdx:number):number{
  const id = ARCS[regionIdx]||'loen-tax';
  const a = arcOf(s,id);
  return 1 + (a.scarcity-20)/200 + (a.danger-15)/300;
}
