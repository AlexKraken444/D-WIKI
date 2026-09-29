'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Article } from '@/lib/types';
type Input = Partial<Article> & Pick<Article,'title'|'content'|'excerpt'|'cover'|'category'|'author_name'>;
type WikiContext = { articles:Article[]; ready:boolean; error:string; userId:string|null; saved:string[]; toggleSaved:(id:string)=>void; refresh:()=>Promise<void>; save:(input:Input)=>Promise<string>; upload:(file:File)=>Promise<string>; demo:boolean };
const Context=createContext<WikiContext|null>(null);
async function responseData(response:Response) { const data=await response.json(); if(!response.ok)throw new Error(data.error||'Ошибка сервера.');return data; }
export function WikiProvider({children}:{children:React.ReactNode}) {
 const [articles,setArticles]=useState<Article[]>([]), [ready,setReady]=useState(false), [error,setError]=useState(''), [userId,setUserId]=useState<string|null>(null), [saved,setSaved]=useState<string[]>([]);
 const refresh=useCallback(async()=>{try{const data=await responseData(await fetch('/api/articles',{cache:'no-store'}));setArticles(data.articles);setUserId(data.userId);setError('');}catch(e){setError((e as Error).message);}finally{setReady(true);}},[]);
 useEffect(()=>{void refresh();const sync=()=>{try{setSaved(JSON.parse(localStorage.getItem('d-wiki-saved')||'[]'));}catch{}};sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[refresh]);
 async function save(input:Input){const previous=articles.find(a=>a.id===input.id);const data=await responseData(await fetch('/api/articles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,updated_at:previous?.updated_at})}));const article=data.article as Article;setArticles(current=>[article,...current.filter(a=>a.id!==article.id)]);return article.id;}
 async function upload(file:File){if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>1024*1024)throw new Error('Выберите JPG, PNG, WebP или GIF до 1 МБ.');const body=new FormData();body.set('file',file);return (await responseData(await fetch('/api/images',{method:'POST',body}))).url as string;}
 function toggleSaved(id:string){const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('d-wiki-saved',JSON.stringify(next));setSaved(next);}catch{setError('Браузер не разрешает сохранить закладки.');}}
 return <Context.Provider value={{articles,ready,error,userId,saved,toggleSaved,refresh,save,upload,demo:false}}>{children}</Context.Provider>;
}
export function useWiki(){const context=useContext(Context);if(!context)throw new Error('WikiProvider is missing');return context;}
