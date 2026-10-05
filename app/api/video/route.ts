import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { redis,configured } from '@/lib/redis';
import { author,sameOrigin,allowed } from '@/lib/server-auth';
import { videoMime,MAX_VIDEO_BYTES,VIDEO_CHUNK_BYTES } from '@/lib/video';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const fail=(error:string,status:number)=>NextResponse.json({error},{status});
 if(!sameOrigin(request))return fail('Недопустимый источник запроса.',403);
 if(!configured())return fail('Upstash Redis ещё не подключён.',503);
 try{
  const owner=await author();if(!owner)return fail('Обновите страницу перед загрузкой.',401);
  if(Number(request.headers.get('content-length'))>MAX_VIDEO_BYTES+65536)return fail('Видеофайл должен быть не больше 3 МБ.',413);
  const file=(await request.formData()).get('file');
  if(!(file instanceof File)||file.size===0||file.size>MAX_VIDEO_BYTES)return fail('Выберите видеофайл до 3 МБ.',400);
  const bytes=Buffer.from(await file.arrayBuffer());const mime=videoMime(bytes);
  if(!mime)return fail('Поддерживаются MP4 и WebM.',400);
  if(!await allowed(owner,'video-upload',20))return fail('Лимит загрузок видео: попробуйте через час.',429);
  const id=randomUUID(),chunks=Math.ceil(bytes.length/VIDEO_CHUNK_BYTES);
  // Incomplete uploads expire; publish metadata only when every chunk exists.
  for(let batch=0;batch<chunks;batch+=8){await Promise.all(Array.from({length:Math.min(8,chunks-batch)},(_,j)=>{const i=batch+j;return redis('SET',`dw:video:${id}:${i}`,bytes.subarray(i*VIDEO_CHUNK_BYTES,(i+1)*VIDEO_CHUNK_BYTES).toString('base64'),'EX',3600);}));}
  const keys=Array.from({length:chunks},(_,i)=>`dw:video:${id}:${i}`);
  await redis('EVAL',"for i=2,#KEYS do if redis.call('EXISTS',KEYS[i]) == 0 then return redis.error_reply('missing chunk') end end; for i=2,#KEYS do redis.call('PERSIST',KEYS[i]) end; redis.call('SET',KEYS[1],ARGV[1]); return 1",chunks+1,`dw:video:${id}`,...keys,JSON.stringify({mime,size:bytes.length,chunks}));
  return NextResponse.json({url:`/api/video/${id}`},{status:201});
 }catch{return fail('Не удалось загрузить видео. Попробуйте ещё раз.',503);}
}
