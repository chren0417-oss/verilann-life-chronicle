'use client';
import {useState} from 'react';
import {X} from 'lucide-react';
import {date,events} from '../lib/game';
import type {Game} from '../lib/game';

const filters=['全部','突破','转职','剧情','其他'] as const;
type Filter=typeof filters[number];
const kindOf=(e:{title:string,changes?:string[]})=>{const t=e.title||'';const ev=events.filter(x=>t.startsWith(x.title)).sort((a,b)=>b.title.length-a.title.length)[0];if(ev){if(ev.id.startsWith('mastery'))return '突破';if(ev.id.startsWith('farmer')||ev.id.startsWith('knight')||ev.id.startsWith('story')||ev.choices.some(c=>c.flag))return '剧情';}if(t.includes('新的道路')||(e.changes||[]).some(c=>String(c).includes('解锁转职')))return '转职';return '其他'};

export default function LifeRetrospect({game,onClose}:{game:Game,onClose:()=>void}){
 const total=game.log.length;
 const [filter,setFilter]=useState<Filter>('全部');
 const [shown,setShown]=useState(150);
 const [open,setOpen]=useState<number|null>(null);
 const filtered=filter==='全部'?game.log:game.log.filter(e=>kindOf(e)===filter);
 const items=filtered.slice(0,shown).reverse();
 return <div className="modal-backdrop" onClick={onClose}><div className="modal replay-modal retrospect-modal" onClick={e=>e.stopPropagation()}>
  <div className="replay-modal-head"><b>人生回顾</b><small>{filter==='全部'?total+' 段经历':filter+' · '+filtered.length+' 段'}</small><button aria-label="关闭" onClick={onClose}><X size={16}/></button></div>
  <div className="retro-filters">{filters.map(f=><button key={f} className={filter===f?'active':''} onClick={()=>{setFilter(f);setShown(150)}}>{f}</button>)}</div>
  <div className="retro-list">
   {items.map((e,i)=>{const idx=shown-i-1;const isOpen=open===idx;return <div key={idx} className={"retro-item"+(isOpen?' open':'')} onClick={()=>setOpen(isOpen?null:idx)}><div className="retro-head"><small>{date(e.day)}</small><b>{e.title}</b>{e.changes?.length?<em>+{e.changes.length} 项</em>:null}</div>{isOpen&&<><p className="retro-text">{e.text}</p>{e.changes?.length?<div className="changes">{e.changes.map((c,j)=><span key={j}>{c}</span>)}</div>:null}</>}</div>})}
   {filtered.length===0&&<p className="retro-empty">没有这类经历。</p>}
  </div>
  {shown<filtered.length&&<button className="retro-more" onClick={()=>setShown(s=>Math.min(filtered.length,s+150))}>加载更早 · 已显示 {shown}/{filtered.length}</button>}
 </div></div>;
}
