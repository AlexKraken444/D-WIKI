'use client';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkWikiLinks } from '@/lib/autolink';
import { useWiki } from './wiki-provider';
export function Markdown({content,currentId}:{content:string;currentId?:string}) {
 const {articles}=useWiki();
 return <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm,[remarkWikiLinks,{articles,currentId}]]} urlTransform={(url,key)=>key==='src'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(url)?url:defaultUrlTransform(url)} components={{a:({href,children})=><a href={href} {...(href?.startsWith('http')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{children}</a>,img:({src,alt})=><img src={typeof src==='string'?src:undefined} alt={alt||'Изображение к статье'} loading="lazy"/>}}>{content}</ReactMarkdown></div>;
}
