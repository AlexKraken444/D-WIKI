import { categories } from './types';
export function validateArticle(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Некорректные данные статьи.');
  const input = value as Record<string, unknown>;
  function field(name: string, min: number, max: number) {
    if (typeof input[name] !== 'string') throw new Error(`Некорректное поле: ${name}`);
    const text = (input[name] as string).trim();
    if (text.length < min || text.length > max) throw new Error(`Поле ${name}: от ${min} до ${max} символов.`);
    return text;
  }
  const title = field('title', 2, 120), content = field('content', 30, 100000), excerpt = field('excerpt', 0, 300), cover = field('cover', 0, 2048), category = field('category', 1, 30), author_name = field('author_name', 1, 60);
  if (!categories.slice(1).includes(category)) throw new Error('Выберите категорию.');
  if (cover && !/^https?:\/\/\S+$/i.test(cover) && !/^\/api\/images\/[a-f0-9-]{36}$/.test(cover)) throw new Error('Некорректная ссылка на обложку.');
  return { title, content, excerpt, cover, category, author_name };
}
