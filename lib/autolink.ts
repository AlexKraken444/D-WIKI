import type { Root, PhrasingContent } from 'mdast';
import { visit, SKIP } from 'unist-util-visit';

export function buildTerms(articles: {id: string; title: string}[], currentId?: string) {
  const terms = new Map<string, string>();
  for (const article of articles.filter(a => a.id !== currentId)) terms.set(article.title.toLocaleLowerCase('ru'), article.id);
  for (const article of articles.filter(a => a.id !== currentId)) {
    for (const word of article.title.match(/[\p{L}\p{N}]+/gu) || []) {
      const lower = word.toLocaleLowerCase('ru');
      if (!terms.has(lower)) terms.set(lower, article.id);
    }
  }
  return [...terms].sort((a, b) => b[0].length - a[0].length);
}
export function linkText(text: string, terms: [string, string][]): PhrasingContent[] {
  if (!terms.length) return [{ type: 'text', value: text }];
  const lookup = new Map(terms);
  const escaped = terms.map(([term]) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(${escaped})(?![\\p{L}\\p{N}_])`, 'giu');
  const result: PhrasingContent[] = [];
  let position = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index! > position) result.push({type:'text',value:text.slice(position,match.index)});
    const id = lookup.get(match[0].toLocaleLowerCase('ru'))!;
    result.push({type:'link',url:`/article/${encodeURIComponent(id)}`,children:[{type:'text',value:match[0]}]});
    position = match.index! + match[0].length;
  }
  if (position < text.length) result.push({type:'text',value:text.slice(position)});
  return result;
}
export function remarkWikiLinks(options: { articles: {id:string;title:string}[]; currentId?:string }) {
  const terms = buildTerms(options.articles, options.currentId);
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (['link', 'linkReference', 'code', 'inlineCode', 'image', 'imageReference', 'html'].includes(node.type)) return SKIP;
      if (node.type !== 'text' || !parent || index === undefined) return;
      const pieces = linkText(node.value, terms);
      parent.children.splice(index, 1, ...pieces as typeof parent.children);
      return index + pieces.length;
    });
  };
}
