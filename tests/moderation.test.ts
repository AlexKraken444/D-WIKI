import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import {validModeratorPassword} from '../lib/moder-password';
import {validateArticle} from '../lib/article-validation';
test('Moderator password rejects missing, invalid and oversized input',()=>{
 for(const value of [null,undefined,{},'', 'wrong-password', 'a'.repeat(257)])assert.equal(validModeratorPassword(value),false);
});
test('Moderator hash checks exact password and supports server-side rotation',()=>{
 const previous=process.env.MODERATOR_PASSWORD_HASH;
 try {
  const salt='test-salt';process.env.MODERATOR_PASSWORD_HASH=`${salt}:${scryptSync('test-only-password',salt,64).toString('hex')}`;
  assert.equal(validModeratorPassword('test-only-password'),true);
  assert.equal(validModeratorPassword('Test-only-password'),false);
  process.env.MODERATOR_PASSWORD_HASH='invalid';assert.equal(validModeratorPassword('test-only-password'),false);
 }finally{if(previous===undefined)delete process.env.MODERATOR_PASSWORD_HASH;else process.env.MODERATOR_PASSWORD_HASH=previous;}
});
test('Public article input cannot self-approve or assign moderator privileges',()=>{
 const article=validateArticle({title:'Статья',content:'Это достаточно длинный текст статьи для проверки.',excerpt:'',cover:'',category:'Проекты',author_name:'Автор',approved:true,isModerator:true,author_id:'someone-else'});
 for(const key of ['approved','isModerator','author_id'])assert.equal(key in article,false);
});
