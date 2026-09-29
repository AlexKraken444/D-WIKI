'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWiki } from './wiki-provider';
import type { Article } from '@/lib/types';
const sourceKey = 'd-wiki-articles-v1';
export function RecoveryNotice() {
  const [count, setCount] = useState(0);
  useEffect(() => { try { const rows = JSON.parse(localStorage.getItem(sourceKey) || '[]'); if (Array.isArray(rows)) setCount(rows.length); } catch {} }, []);
  return count ? <div className="demo-bar">В браузере найдены прежние статьи: {count}. <Link href="/recover">Восстановить и сделать публичными →</Link></div> : null;
}
export function Recovery() {
  const { ready, userId, error, save, upload, refresh } = useWiki();
  const [rows, setRows] = useState<Article[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [raw, setRaw] = useState('[]');
  useEffect(() => {
    try {
      const text = localStorage.getItem(sourceKey) || '[]'; setRaw(text);
      const value = JSON.parse(text);
      if (!Array.isArray(value)) throw new Error('Неверный формат старого хранилища.');
      setRows(value);
    } catch (e) { setMessages([(e as Error).message]); }
    setLoaded(true);
  }, []);
  function backup() {
    const url = URL.createObjectURL(new Blob([raw], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'd-wiki-articles-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function restore() {
    setBusy(true); setMessages([]); backup();
    const report: string[] = [];
    const imageCache = new Map<string,string>();
    async function imageUrl(url: string) {
      if (!url.startsWith('data:')) return url;
      if (imageCache.has(url)) return imageCache.get(url)!;
      const blob = await (await fetch(url)).blob();
      const result = await upload(new File([blob], 'restored-image', {type:blob.type}));
      imageCache.set(url,result); return result;
    }
    try {
      // Read the current public list before import, including after a partial retry.
      const response = await fetch('/api/articles', {cache:'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'База недоступна.');
      const existing = data.articles as Article[];
      for (const row of rows) {
        try {
          if (typeof row.title !== 'string' || typeof row.content !== 'string') throw new Error('Повреждённые данные. Исходная копия сохранена.');
          const checkpoint = `d-wiki-restored:${row.id}`;
          const priorId = localStorage.getItem(checkpoint);
          if (priorId && existing.some(a => a.id === priorId)) { report.push(`${row.title}: уже восстановлена.`); continue; }
          const duplicate = existing.find(a => a.title.trim().toLocaleLowerCase('ru') === row.title.trim().toLocaleLowerCase('ru'));
          if (duplicate) throw new Error('Такое заглавие уже есть в общей базе. Статья не перезаписана.');
          let content = row.content;
          const images = [...new Set(content.match(/data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+/g) || [])];
          for (const src of images) content = content.split(src).join(await imageUrl(src));
          const id = await save({title:row.title, content, cover:await imageUrl(row.cover || ''), excerpt:row.excerpt || '', category:row.category, author_name:row.author_name || 'Автор'});
          try { localStorage.setItem(checkpoint,id); } catch {}
          existing.push({...row,id});
          report.push(`${row.title}: опубликована.`);
        } catch (e) { report.push(`${row.title || 'Статья'}: ${(e as Error).message}`); }
        finally { setMessages([...report]); }
      }
      await refresh();
    } catch (e) { setMessages([...report,(e as Error).message]); }
    finally { setBusy(false); }
  }
  return <div className="page-content about-page"><div className="eyebrow">ВОССТАНОВЛЕНИЕ</div><h1>Ваши прежние статьи</h1><p className="article-lead">Исходные данные останутся в браузере. Перед переносом скачается резервная копия; статьи и картинки попадут в общую базу, а право редактирования останется в этом браузере.</p>{!loaded?<p>Проверяем хранилище…</p>:<><p>Найдено статей: <strong>{rows.length}</strong></p>{rows.length?<><ul>{rows.map((row,i)=><li key={i}>{row.title || 'Без заглавия'}</li>)}</ul><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button className="button" onClick={backup}>Скачать резервную копию</button><button className="button dark" disabled={!ready || !userId || busy} onClick={()=>void restore()}>{busy?'Восстанавливаем…':'Восстановить и опубликовать всё'}</button></div></>:<p>На этом адресе в этом браузере старых статей нет. Откройте эту страницу в браузере, где вы их писали, и на прежнем адресе сайта.</p>}</>}{error&&<p className="error-banner">{error}</p>}<div aria-live="polite">{messages.map((message,i)=><p key={i}>{message}</p>)}</div><p><Link className="text-link" href="/">Перейти к общей ленте →</Link></p></div>;
}
