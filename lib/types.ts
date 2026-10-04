export type Article = { approved?: boolean; id: string; title: string; category: string; excerpt: string; content: string; cover: string; author_id: string; author_name: string; created_at: string; updated_at: string };
export const categories = ['Все статьи', 'История Класса', 'Мемы Класса', 'Знаменитости Класса', 'Проекты', 'Ученики Класса'];
// Keep existing articles available when retiring the old categories.
export const normalizeCategory = (category: string) => categories.slice(1).includes(category) ? category : category === 'История' ? 'История Класса' : 'Проекты';
// Estimate visible text at 180 words/minute; media URLs and Markdown are not words.
export const readingTime = (text: string) => {
  const visibleText = text
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^\n]*?\)/g, '$1')
    .replace(/^\s*\[[^\]]+\]:\s+.*$/gm, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]*>/g, ' ');
  const words = visibleText.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  const seconds = Math.ceil(words / 3);
  if (seconds < 60) return `≈ ${Math.max(1, seconds)} сек`;
  const minutes = Math.floor(seconds / 60);
  return `≈ ${minutes} мин${seconds % 60 ? ` ${seconds % 60} сек` : ''}`;
};
export const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
