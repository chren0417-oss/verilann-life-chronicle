import type {Game} from './game';
export type Slot={id:string,label:string,game:Game,history:Game[],updated:string};
export function pushHistory(history:Game[],current:Game){return [...history,current].slice(-20)}
export function popHistory(history:Game[]){return history.length?{game:history[history.length-1],history:history.slice(0,-1)}:null}
export function upsertSlot(slots:Slot[],id:string,game:Game,history:Game[],updated:string):Slot[]{const slot={id,label:slots.find(x=>x.id===id)?.label||game.draft.name+'的人生',game,history,updated};return [...slots.filter(x=>x.id!==id),slot]}
