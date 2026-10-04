import { redis } from '@/lib/redis';
import { audioRange,AUDIO_CHUNK_BYTES } from '@/lib/audio';
export const runtime='nodejs';
async function serve(request:Request,params:Promise<{id:string}>,head:boolean){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
 try{
  const raw=await redis<string|null>('GET',`dw:audio:${id}`);if(!raw)return new Response(null,{status:404});
  const meta=JSON.parse(raw) as {mime:string;size:number;chunks:number};
  const range=audioRange(request.headers.get('range'),meta.size);
  if(!range)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${meta.size}`,'Accept-Ranges':'bytes'}});
  const headers:Record<string,string>={'Content-Type':meta.mime,'Content-Length':String(range.end-range.start+1),'Accept-Ranges':'bytes','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'};
  if(range.partial)headers['Content-Range']=`bytes ${range.start}-${range.end}/${meta.size}`;
  if(head)return new Response(null,{status:range.partial?206:200,headers});
  const first=Math.floor(range.start/AUDIO_CHUNK_BYTES),last=Math.floor(range.end/AUDIO_CHUNK_BYTES);
  const parts=await redis<(string|null)[]>('MGET',...Array.from({length:last-first+1},(_,i)=>`dw:audio:${id}:${first+i}`));
  if(parts.some(part=>part===null))return new Response(null,{status:503});
  const data=Buffer.concat(parts.map(part=>Buffer.from(part!,'base64'))).subarray(range.start-first*AUDIO_CHUNK_BYTES,range.end-first*AUDIO_CHUNK_BYTES+1);
  return new Response(data,{status:range.partial?206:200,headers});
 }catch{return new Response(null,{status:503});}
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return serve(request,params,false);}
export async function HEAD(request:Request,{params}:{params:Promise<{id:string}>}){return serve(request,params,true);}
