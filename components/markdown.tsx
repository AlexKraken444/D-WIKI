'use client';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkWikiLinks } from '@/lib/autolink';
import { useWiki } from './wiki-provider';
export function Markdown({content,currentId,cover,title}:{content:string;currentId?:string;cover?:string;title?:string}) {
 const {articles}=useWiki();
 return <div className="prose wiki-prose">{cover&&<figure className="wiki-image wiki-image-right infobox"><figcaption className="infobox-title">{title}</figcaption><img src={cover} alt={title||'Обложка статьи'}/></figure>}<ReactMarkdown remarkPlugins={[remarkGfm,[remarkWikiLinks,{articles,currentId}]]} urlTransform={(url,key)=>key==='src'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(url)?url:defaultUrlTransform(url)} components={{h2:({node,children})=><h2 id={`section-${node?.position?.start.line}`}>{children}</h2>,h3:({node,children})=><h3 id={`section-${node?.position?.start.line}`}>{children}</h3>,a:({href,children})=><a href={href} {...(href?.startsWith('http')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{children}</a>,img:({src,alt,title:imageTitle})=><span role="figure" aria-label={alt||'Изображение к статье'} className={`wiki-image wiki-image-${imageTitle==='left'?'left':'right'}`}><img src={typeof src==='string'?src:undefined} alt={alt||'Изображение к статье'} loading="lazy"/>{alt&&<span className="wiki-caption">{alt}</span>}</span>}}>{content}</ReactMarkdown></div>;
}
