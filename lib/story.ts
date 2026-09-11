// ============================================================
// 维尔兰 · 世界剧情事件库（story）
// 依据《维尔兰世界剧情圣经》重构：删除原职业专属剧情
// 剧情不再绑定职业，而是由地区局势、NPC 关系、未解事件推动
// 事件卡定义在 region-arcs.ts，本文件只负责编译接入 events
// ============================================================
import type {Event} from './game';
import {storyCards} from './region-arcs';
import {compileStoryEvents} from './story-engine';

export const storyEvents:Event[] = compileStoryEvents(storyCards);
