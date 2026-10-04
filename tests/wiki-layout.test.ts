import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {WikiProvider} from '../components/wiki-provider';
import {Markdown} from '../components/markdown';
import {categories,normalizeCategory} from '../lib/types';
test('Only class categories remain; legacy articles keep a valid category',()=>{
 assert.deepEqual(categories.slice(1),['История Класса','Мемы Класса','Знаменитости Класса','Проекты','Ученики Класса']);
 assert.equal(normalizeCategory('Наука'),'Проекты');
 assert.equal(normalizeCategory('История'),'История Класса');
});
test('Uploaded images float on the selected side and retain following text',()=>{
 const content='До картинки.\n\n![Подпись](/api/images/123 "left")\n\nТекст справа.\n\n---\n\nТекст под картинкой.\n\n![Вторая](/api/images/456 "right")\n\nПосле второй.';
 const html=renderToStaticMarkup(createElement(WikiProvider,null,createElement(Markdown,{content})));
 assert.match(html,/wiki-image-left/);assert.match(html,/wiki-image-right/);
 assert.match(html,/<span class="wiki-caption">Подпись<\/span>/);
 assert.match(html,/Текст справа/);assert.match(html,/<hr\/>/);assert.match(html,/Текст под картинкой/);assert.match(html,/После второй/);
});
