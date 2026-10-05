import { redis } from '@/lib/redis';
import { videoRange,VIDEO_CHUNK_BYTES } from '@/lib/video';
export const runtime='nodejs';
export const maxDuration=60;
async function serve(request:Request,params:Promise<{id:string}>,head:boolean){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
 try{
  const raw=await redis<string|null>('GET',`dw:video:${id}`);if(!raw)return new Response(null,{status:404});
  const meta=JSON.parse(raw) as {mime:string;size:number;chunks:number;chunkSize?:number;storage?:string};
  const range=videoRange(request.headers.get('range'),meta.size);
  if(!range)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${meta.size}`,'Accept-Ranges':'bytes'}});
  // Keep each seek response bounded; browsers request the following range as needed.
  if(range.partial)range.end=Math.min(range.end,range.start+768*1024-1);
  const headers:Record<string,string>={'Content-Type':meta.mime,'Content-Length':String(range.end-range.start+1),'Accept-Ranges':'bytes','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'};
  if(range.partial)headers['Content-Range']=`bytes ${range.start}-${range.end}/${meta.size}`;
  if(head)return new Response(null,{status:range.partial?206:200,headers});
  const chunkSize=meta.chunkSize||VIDEO_CHUNK_BYTES;
  let index=Math.floor(range.start/chunkSize);
  const last=Math.floor(range.end/chunkSize);
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({
   async pull(controller){
    try{
     const part=meta.storage==='hash'?await redis<string|null>('HGET',`dw:video-data:${id}`,`part:${index}`):await redis<string|null>('GET',`dw:video:${id}:${index}`);
     if(cancelled)return;
     if(part===null)throw new Error('Missing video chunk');
     const bytes=Buffer.from(part,'base64');
     controller.enqueue(bytes.subarray(Math.max(0,range.start-index*chunkSize),Math.min(bytes.length,range.end-index*chunkSize+1)));
     if(index++===last)controller.close();
    }catch(error){if(!cancelled)controller.error(error);}
   },
   cancel(){cancelled=true;}
  });
  return new Response(stream,{status:range.partial?206:200,headers});
 }catch{return new Response(null,{status:503});}
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return serve(request,params,false);}
export async function HEAD(request:Request,{params}:{params:Promise<{id:string}>}){return serve(request,params,true);}
