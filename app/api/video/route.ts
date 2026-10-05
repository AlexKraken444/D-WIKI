import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { redis, configured } from '@/lib/redis';
import { author, sameOrigin } from '@/lib/server-auth';
import { videoMime, VIDEO_UPLOAD_CHUNK_BYTES } from '@/lib/video';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
 const fail=(error:string,status:number)=>NextResponse.json({error},{status});
 if(!sameOrigin(request))return fail('Недопустимый источник запроса.',403);
 if(!configured())return fail('Upstash Redis ещё не подключён.',503);
 try {
  const owner=await author();if(!owner)return fail('Обновите страницу перед загрузкой.',401);
  const url=new URL(request.url), action=url.searchParams.get('action');
  if(action==='start'){
   const size=Number(url.searchParams.get('size'));
   if(!Number.isSafeInteger(size)||size<=0)return fail('Выберите непустой видеофайл.',400);
   const id=randomUUID();
   await redis('EVAL',"redis.call('HSET',KEYS[1],'owner',ARGV[1],'size',ARGV[2],'next',0); redis.call('EXPIRE',KEYS[1],86400); return 1",1,`dw:video-data:${id}`,owner,size);
   return NextResponse.json({id,chunkSize:VIDEO_UPLOAD_CHUNK_BYTES});
  }
  const id=url.searchParams.get('id');
  if(!id||!/^[a-f0-9-]{36}$/.test(id))return fail('Неверная загрузка.',400);
  const key=`dw:video-data:${id}`;
  const fields=await redis<(string|null)[]>('HMGET',key,'owner','size');
  if(fields[0]!==owner)return fail('Загрузка недоступна или истекла.',403);
  const size=Number(fields[1]);
  if(action==='chunk'){
   const index=Number(url.searchParams.get('index'));
   const expected=Math.min(VIDEO_UPLOAD_CHUNK_BYTES,size-index*VIDEO_UPLOAD_CHUNK_BYTES);
   if(!Number.isSafeInteger(index)||index<0||expected<=0)return fail('Неверная часть файла.',400);
   const reader=request.body?.getReader();if(!reader)return fail('Пустая часть файла.',400);
   const pieces:Uint8Array[]=[];let total=0;
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>expected){await reader.cancel();return fail('Неверный размер части.',413);}pieces.push(value);}
   if(total!==expected)return fail('Часть передана не полностью.',400);
   const bytes=Buffer.concat(pieces),mime=index===0?videoMime(bytes):'';
   if(index===0&&!mime)return fail('Поддерживаются MP4 и WebM.',400);
   const result=await redis<number>('EVAL',"if redis.call('HGET',KEYS[1],'owner') ~= ARGV[1] then return -1 end; if redis.call('EXISTS',KEYS[2]) == 1 then return -1 end; local n=tonumber(redis.call('HGET',KEYS[1],'next')); local i=tonumber(ARGV[2]); if i<n then return 1 end; if i~=n then return 0 end; redis.call('HSET',KEYS[1],'part:'..ARGV[2],ARGV[3],'next',n+1); if i==0 then redis.call('HSET',KEYS[1],'mime',ARGV[4]) end; redis.call('EXPIRE',KEYS[1],86400); return 1",2,key,`dw:video:${id}`,owner,index,bytes.toString('base64'),mime||'');
   if(result!==1)return fail('Нарушен порядок загрузки. Выберите файл ещё раз.',409);
   return NextResponse.json({ok:true});
  }
  if(action==='finish'){
   const chunks=Math.ceil(size/VIDEO_UPLOAD_CHUNK_BYTES);
   const result=await redis<number>('EVAL',"if redis.call('HGET',KEYS[1],'owner') ~= ARGV[1] then return 0 end; if tonumber(redis.call('HGET',KEYS[1],'next')) ~= tonumber(ARGV[2]) then return 0 end; local mime=redis.call('HGET',KEYS[1],'mime'); if not mime then return 0 end; redis.call('PERSIST',KEYS[1]); redis.call('SET',KEYS[2],cjson.encode({mime=mime,size=tonumber(ARGV[3]),chunks=tonumber(ARGV[2]),chunkSize=tonumber(ARGV[4]),storage='hash'})); return 1",2,key,`dw:video:${id}`,owner,chunks,size,VIDEO_UPLOAD_CHUNK_BYTES);
   if(result!==1)return fail('Видео загружено не полностью.',409);
   return NextResponse.json({url:`/api/video/${id}`},{status:201});
  }
  return fail('Обновите страницу перед загрузкой видео.',400);
 }catch{return fail('Не удалось загрузить видео. Проверьте соединение и доступное место в Upstash.',503);}
}
