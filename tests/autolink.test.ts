import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTerms, linkText, remarkWikiLinks } from '../lib/autolink';
import type { Root } from 'mdast';
const articles=[{id:'space',title:'Вселенная'},{id:'ai',title:'Искусственный интеллект'},{id:'ocean',title:'Океан'}];
test('Links exact titles with matching case and whole word boundaries',()=>{
 const nodes=linkText('Вселенная, Океан. ВСЕЛЕННАЯ, океан. Океанология.',buildTerms(articles));
 assert.equal(nodes.filter(n=>n.type==='link').length,2);
 assert.equal(nodes.at(-1)?.type,'text');
});
test('Only the complete title links, not individual title words',()=>{
 const nodes=linkText('Искусственный интеллект и интеллект.',buildTerms(articles));
 assert.equal(nodes.filter(n=>n.type==='link').length,1);
 assert.equal(nodes[0].type,'link');
 if(nodes[0].type==='link')assert.deepEqual(nodes[0].children,[{type:'text',value:'Искусственный интеллект'}]);
});

test('Title spacing and punctuation must match exactly',()=>{
 const terms=buildTerms([{id:'class',title:'Наш класс (2026)'}]);
 const nodes=linkText('Наш класс (2026). Наш  класс (2026). Наш класс 2026. наш класс (2026).',terms);
 assert.equal(nodes.filter(n=>n.type==='link').length,1);
});

test('Longest complete title wins when another article has a shorter title',()=>{
 const nodes=linkText('Искусственный интеллект и интеллект.',buildTerms([...articles,{id:'short',title:'интеллект'}]));
 const links=nodes.filter(n=>n.type==='link');
 assert.deepEqual(links.map(n=>n.url),['/article/ai','/article/short']);
});
test('Does not link to current article',()=>{
 assert.equal(linkText('Океан',buildTerms(articles,'ocean'))[0].type,'text');
});
test('Never nests links or rewrites code',()=>{
 const tree:Root={type:'root',children:[{type:'paragraph',children:[{type:'link',url:'https://example.com',children:[{type:'text',value:'Океан'}]},{type:'inlineCode',value:'Океан'},{type:'text',value:' Океан'}]}]};
 remarkWikiLinks({articles})(tree);
 const paragraph=tree.children[0];
 if(paragraph.type!=='paragraph')throw new Error('Invalid tree');
 assert.equal(paragraph.children.length,4);
 assert.equal(paragraph.children[0].type,'link');
 assert.equal(paragraph.children[1].type,'inlineCode');
 assert.equal(paragraph.children[3].type,'link');
});
