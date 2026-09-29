'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/lib/types';

type WikiContext = { articles: Article[]; ready: boolean; error: string; userId: string | null; saved: string[]; toggleSaved: (id:string)=>void; refresh:()=>Promise<void>; save: (article: Partial<Article> & Pick<Article,'title'|'content'|'excerpt'|'cover'|'category'|'author_name'>)=>Promise<string>; upload:(file:File)=>Promise<string>; demo:boolean };
const Context = createContext<WikiContext | null>(null);
const STORE = 'd-wiki-articles-v1';
export function WikiProvider({children}:{children:React.ReactNode}) {
  const [articles,setArticles] = useState<Article[]>([]);
  const [ready,setReady] = useState(false);
  const [error,setError] = useState('');
  const [userId,setUserId] = useState<string|null>(null);
  const [saved,setSaved] = useState<string[]>([]);
  const refresh = useCallback(async () => {
    try {
      if (supabase) {
        const {data,error} = await supabase.from('articles').select('*').order('created_at',{ascending:false});
        if (error) throw error;
        setArticles(data || []);
        const {data: session} = await supabase.auth.getSession();
        setUserId(session.session?.user.id || null);
      } else {
        const stored = JSON.parse(localStorage.getItem(STORE) || '[]') as Article[];
        setArticles(stored);
        let id = localStorage.getItem('d-wiki-author');
        if (!id) { id = crypto.randomUUID(); localStorage.setItem('d-wiki-author',id); }
        setUserId(id);
      }
      setSaved(JSON.parse(localStorage.getItem('d-wiki-saved') || '[]'));
      setError('');
    } catch { setError('Не удалось загрузить статьи. Проверьте подключение и попробуйте ещё раз.'); }
    finally { setReady(true); }
  },[]);
  useEffect(() => { void refresh(); const sync=()=>void refresh(); window.addEventListener('storage',sync); return ()=>window.removeEventListener('storage',sync); },[refresh]);
  async function identity() {
    if (!supabase) {
      const id = localStorage.getItem('d-wiki-author');
      if (!id) throw new Error('Разрешите сохранение данных в браузере и обновите страницу.');
      return id;
    }
    const {data:session} = await supabase.auth.getSession();
    if(session.session) return session.session.user.id;
    const {data,error} = await supabase.auth.signInAnonymously();
    if(error || !data.user) throw new Error('Не удалось создать автора. Включите Anonymous Sign-ins в Supabase.');
    setUserId(data.user.id); return data.user.id;
  }
  async function save(input: Parameters<WikiContext['save']>[0]) {
    const author = await identity();
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120 || input.content.trim().length < 30 || input.content.length > 100000) throw new Error('Заглавие: от 2 до 120 символов. Текст: от 30 до 100 000 символов.');
    if(articles.some(a=>a.id!==input.id && a.title.toLocaleLowerCase('ru') === title.toLocaleLowerCase('ru'))) throw new Error('Статья с таким заглавием уже существует. Выберите другое.');
    const previous=articles.find(a=>a.id===input.id);
    if(input.id && (!previous || previous.author_id!==author)) throw new Error('Редактировать статью можно только в браузере её автора.');
    const now=new Date().toISOString();
    const article:Article={...input,title,id:input.id || crypto.randomUUID(),author_id:author,created_at:previous?.created_at || now,updated_at:now};
    if(supabase) {
      const values={title:article.title,content:article.content,excerpt:article.excerpt,cover:article.cover,category:article.category,author_name:article.author_name,updated_at:now};
      const result=previous ? await supabase.from('articles').update(values).eq('id',article.id).eq('updated_at',previous.updated_at).select().single() : await supabase.from('articles').insert(article).select().single();
      if(result.error) throw new Error(result.error.code==='23505'?'Это заглавие уже занято.':previous?'Не удалось сохранить. Обновите страницу: статья могла измениться в другой вкладке.':'Не удалось опубликовать статью. Проверьте подключение и настройки базы.');
      Object.assign(article, result.data);
    } else {
      const current=JSON.parse(localStorage.getItem(STORE)||'[]') as Article[];
      if(previous && current.find(a=>a.id===previous.id)?.updated_at !== previous.updated_at) throw new Error('Статья изменена в другой вкладке. Обновите страницу.');
      try { localStorage.setItem(STORE,JSON.stringify([article,...current.filter(a=>a.id!==article.id)])); } catch { throw new Error('Память браузера заполнена. Используйте картинки по ссылке или подключите Supabase.'); }
    }
    setArticles(current=>[article,...current.filter(a=>a.id!==article.id)]);
    return article.id;
  }
  async function upload(file:File) {
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Выберите JPG, PNG, WebP или GIF.');
    if(file.size>5*1024*1024) throw new Error('Максимальный размер изображения — 5 МБ.');
    const author=await identity();
    if(supabase) {
      const path=`${author}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
      const {error}=await supabase.storage.from('article-images').upload(path,file,{contentType:file.type});
      if(error) throw new Error('Не удалось загрузить изображение. Проверьте настройки хранилища.');
      return supabase.storage.from('article-images').getPublicUrl(path).data.publicUrl;
    }
    if(file.size>1024*1024) throw new Error('В деморежиме — до 1 МБ. Для больших файлов используйте ссылку.');
    return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Не удалось прочитать файл.'));reader.readAsDataURL(file);});
  }
  function toggleSaved(id:string) { const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('d-wiki-saved',JSON.stringify(next));setSaved(next);}catch{setError('Браузер не разрешает сохранить закладки.');} }
  return <Context.Provider value={{articles,ready,error,userId,saved,toggleSaved,refresh,save,upload,demo:!supabase}}>{children}</Context.Provider>;
}
export function useWiki(){const context=useContext(Context);if(!context)throw new Error('WikiProvider is missing');return context;}
