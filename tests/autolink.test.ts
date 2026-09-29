import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTerms, linkText, remarkWikiLinks } from '../lib/autolink';
import type { Root } from 'mdast';
const articles=[{id:'space',title:'Вселенная'},{id:'ai',title:'Искусственный интеллект'},{id:'ocean',title:'Океан'}];
test('Links Cyrillic words case-insensitively, preserving boundaries',()=>{
 const nodes=linkText('ВСЕЛЕННАЯ, океан. Океанология.',buildTerms(articles));
 assert.equal(nodes.filter(n=>n.type==='link').length,2);
 assert.equal(nodes.at(-1)?.type,'text');
});
test('Longest title wins and individual title words also link',()=>{
 const nodes=linkText('Искусственный интеллект и интеллект.',buildTerms(articles));
 assert.equal(nodes.filter(n=>n.type==='link').length,2);
 assert.equal(nodes[0].type,'link');
 if(nodes[0].type==='link')assert.deepEqual(nodes[0].children,[{type:'text',value:'Искусственный интеллект'}]);
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
