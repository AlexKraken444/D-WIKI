import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/server-auth';
import { isModerator } from '@/lib/moder-auth';
import { redis } from '@/lib/redis';
import { moderateArticleScript } from '@/lib/moder-script';
export const runtime='nodejs';
export async function POST(request:Request){
 const json=(error:string,status:number)=>NextResponse.json({error},{status});
 if(!sameOrigin(request))return json('Недопустимый источник запроса.',403);
 try{
  if(!await isModerator())return json('Войдите как модератор.',403);
  const text=await request.text();if(text.length>2048)return json('Некорректный запрос.',400);
  let body;try{body=JSON.parse(text);}catch{return json('Некорректный запрос.',400);}
  if(!body||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id)||typeof body.updated_at!=='string'||!['approve','unapprove','delete'].includes(body.action))return json('Некорректное действие.',400);
  const result=await redis<string>('EVAL',moderateArticleScript,3,'dw:articles','dw:titles',`dw:trash:${body.id}`,body.id,body.updated_at,body.action,new Date().toISOString());
  if(result!=='ok')return json(result==='missing'?'Статья не найдена.':'Статья изменилась. Обновите список перед действием.',409);
  return NextResponse.json({ok:true});
 }catch{return json('Не удалось выполнить действие.',503);}
}
