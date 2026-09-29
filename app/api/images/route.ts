import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { redis, configured } from '@/lib/redis';
import { author, sameOrigin, allowed } from '@/lib/server-auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const fail = (error:string,status:number) => NextResponse.json({error},{status});
  if (!sameOrigin(request)) return fail('Недопустимый источник запроса.',403);
  if (!configured()) return fail('Upstash Redis ещё не подключён.',503);
  try {
    const owner = await author();
    if (!owner) return fail('Обновите страницу перед загрузкой.',401);
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || file.size > 1024 * 1024) return fail('Выберите изображение размером до 1 МБ.',400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : ['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString()) ? 'image/gif' : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP' ? 'image/webp' : null;
    if (!mime) return fail('Разрешены только JPG, PNG, WebP и GIF.',400);
    if (!await allowed(owner,'upload',30)) return fail('Лимит загрузок: попробуйте через час.',429);
    const id = randomUUID(), data = bytes.toString('base64');
    const chunks = data.match(/.{1,65536}/g)!;
    // Metadata is published only after all chunks are stored successfully.
    for (let i=0;i<chunks.length;i++) await redis('SET',`dw:image:${id}:${i}`,chunks[i], 'EX', 3600);
    await redis('EVAL', "for i=2,#KEYS do redis.call('PERSIST',KEYS[i]) end; redis.call('SET',KEYS[1],ARGV[1]); return 1", chunks.length+1,`dw:image:${id}`, ...chunks.map((_,i)=>`dw:image:${id}:${i}`), JSON.stringify({mime,chunks:chunks.length}));
    return NextResponse.json({url:`/api/images/${id}`},{status:201});
  } catch { return fail('Не удалось загрузить изображение в Redis.',503); }
}
