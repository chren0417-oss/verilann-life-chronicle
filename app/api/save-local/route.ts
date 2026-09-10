import {validSave} from '../../../lib/game';
export const dynamic='force-dynamic';
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
let lastSnapshotDay=-1;
export async function POST(request:Request){
 try{
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'请求必须使用JSON。'},415);
  const size=Number(request.headers.get('content-length')||0);
  if(size>5_000_000)return json({error:'存档过大，上限5MB。'},413);
  const body:any=await request.json();
  const g=body&&typeof body==='object'&&body.game?body.game:body;
  if(!validSave(g))return json({error:'存档数据不完整，未写入本地文件。'},400);
  let fs:any=null,path:any=null;
  try{fs=await import('node:fs');path=await import('node:path');}catch{return json({saved:false,reason:'当前环境不支持写入本地文件夹。'},200)}
  const dir=path.join(process.cwd(),'cundang');
  fs.mkdirSync(dir,{recursive:true});
  const text=JSON.stringify(g,null,2);
  fs.writeFileSync(path.join(dir,'latest.json'),text,'utf8');
  return json({saved:true,day:g.day,file:'cundang/latest.json'});
 }catch(error){return json({error:(error as Error)?.message||'写入失败。',saved:false},500)}
}
