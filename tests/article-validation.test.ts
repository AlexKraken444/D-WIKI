import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateArticle } from '../lib/article-validation';
const article={title:'Тест',content:'Текст статьи с достаточной длиной для публикации.',excerpt:'Описание',cover:'',category:'Проекты',author_name:'Автор'};
test('Client cannot supply ownership or timestamps',()=>{const result=validateArticle({...article,author_id:'attacker',created_at:'fake'});assert.equal('author_id' in result,false);assert.equal('created_at' in result,false);});
test('Rejects invalid article bodies',()=>{for(const body of [null,{}, {...article,content:'коротко'}, {...article,category:'другое'},{...article,title:'x'.repeat(121)}])assert.throws(()=>validateArticle(body));});
test('Allows uploaded images but rejects unsafe schemes',()=>{assert.equal(validateArticle({...article,cover:'/api/images/12345678-1234-1234-1234-123456789abc'}).cover.startsWith('/api/images/'),true);assert.throws(()=>validateArticle({...article,cover:'javascript:alert(1)'}));assert.throws(()=>validateArticle({...article,cover:'data:image/svg+xml;base64,x'}));});
