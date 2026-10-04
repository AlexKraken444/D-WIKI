export type Article = { id: string; title: string; category: string; excerpt: string; content: string; cover: string; author_id: string; author_name: string; created_at: string; updated_at: string };
export const categories = ['Все статьи', 'История Класса', 'Мемы Класса', 'Знаменитости Класса', 'Проекты', 'Ученики Класса'];
// Keep existing articles available when retiring the old categories.
export const normalizeCategory = (category: string) => categories.slice(1).includes(category) ? category : category === 'История' ? 'История Класса' : 'Проекты';
export const readingTime = (text: string) => Math.max(1, Math.ceil(text.split(/\s+/).length / 180));
export const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
