import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { configured, redis } from '@/lib/redis';
import { author, sameOrigin, allowed } from '@/lib/server-auth';
import { validateArticle } from '@/lib/article-validation';
import { saveArticleScript } from '@/lib/article-script';
import type { Article } from '@/lib/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
export async function GET() {
  if (!configured()) return fail('Подключите Upstash Redis в настройках проекта Vercel.', 503);
  try {
    const id = await author(true);
    const values = await redis<string[]>('HVALS', 'dw:articles');
    const articles = values.map(raw => { const { title_key, ...article } = JSON.parse(raw); void title_key; return article as Article; }).sort((a,b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ articles, userId: id }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return fail('Не удалось подключиться к Upstash Redis. Проверьте настройки базы.', 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Недопустимый источник запроса.', 403);
  if (!configured()) return fail('Upstash Redis ещё не подключён.', 503);
  try {
    const owner = await author();
    if (!owner) return fail('Обновите страницу, чтобы создать сессию автора.', 401);
    const text = await request.text();
    if (Buffer.byteLength(text) > 500000) return fail('Статья слишком большая.', 413);
    let input;
    try { input = JSON.parse(text); } catch { return fail('Некорректный JSON.', 400); }
    let fields;
    try { fields = validateArticle(input); } catch (error) { return fail((error as Error).message, 400); }
    if (input.id && (typeof input.id !== 'string' || !/^[a-f0-9-]{36}$/.test(input.id))) return fail('Некорректный ID статьи.', 400);
    if (input.id && typeof input.updated_at !== 'string') return fail('Не указана версия статьи.', 400);
    if (!await allowed(owner, 'write', 60)) return fail('Лимит публикаций: попробуйте через час.', 429);
    const id = input.id || randomUUID();
    const now = new Date().toISOString();
    const article: Article = { ...fields, id, author_id: owner, created_at: now, updated_at: now };
    const result = await redis<string>('EVAL', saveArticleScript, 2, 'dw:articles', 'dw:titles', id, JSON.stringify(article), input.id ? 'edit' : 'new', input.updated_at || '', fields.title.normalize('NFKC').toLocaleLowerCase('ru'));
    const errors: Record<string, string> = { forbidden: 'Эту статью может редактировать только автор.', missing: 'Статья не найдена.', stale: 'Статья изменена в другой вкладке. Обновите страницу.', duplicate: 'Это заглавие уже занято.', conflict: 'Конфликт публикации. Попробуйте ещё раз.' };
    if (result !== 'ok') return fail(errors[result] || 'Не удалось сохранить статью.', result === 'forbidden' ? 403 : 409);
    const stored = await redis<string>('HGET', 'dw:articles', id);
    const { title_key, ...saved } = JSON.parse(stored); void title_key;
    return NextResponse.json({ article: saved }, { status: input.id ? 200 : 201 });
  } catch { return fail('Не удалось сохранить статью в Upstash Redis.', 503); }
}
