import { redis } from '@/lib/redis';
export const runtime = 'nodejs';
export async function GET(_request: Request, {params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
  try {
    const raw=await redis<string|null>('GET',`dw:image:${id}`);
    if(!raw)return new Response(null,{status:404});
    const meta=JSON.parse(raw) as {mime:string;chunks:number};
    const parts=await redis<(string|null)[]>('MGET',...Array.from({length:meta.chunks},(_,i)=>`dw:image:${id}:${i}`));
    if(parts.some(p=>p===null))return new Response(null,{status:503});
    return new Response(Buffer.from(parts.join(''),'base64'),{headers:{'Content-Type':meta.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}});
  }catch{return new Response(null,{status:503});}
}
