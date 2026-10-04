import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { sameOrigin, allowed, author } from '@/lib/server-auth';
import { isModerator, startModeratorSession, endModeratorSession } from '@/lib/moder-auth';
import { validModeratorPassword } from '@/lib/moder-password';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){try{return json({authenticated:await isModerator()});}catch{return json({error:'База недоступна.'},503);}}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Недопустимый источник запроса.'},403);
 try{
  const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown';
  const bucket=createHash('sha256').update(ip).digest('hex');
  if(!await allowed(bucket,'moder-login',10))return json({error:'Слишком много попыток. Повторите через час.'},429);
  const text=await request.text();if(text.length>1024)return json({error:'Некорректный запрос.'},400);
  let body;try{body=JSON.parse(text);}catch{return json({error:'Некорректный запрос.'},400);}
  if(!validModeratorPassword(body?.password))return json({error:'Неверный пароль.'},401);
  await startModeratorSession();await author(true);
  return json({authenticated:true});
 }catch{return json({error:'Не удалось войти. Проверьте подключение Redis.'},503);}
}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return json({error:'Недопустимый источник запроса.'},403);
 try{await endModeratorSession();return json({authenticated:false});}catch{return json({error:'Не удалось завершить сессию. Повторите.'},503);}
}
