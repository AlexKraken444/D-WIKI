import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {audioMime,audioRange,audioMarkdown} from '../lib/audio';
import {WikiProvider} from '../components/wiki-provider';
import {Markdown} from '../components/markdown';
test('Recognizes supported audio headers and rejects images and HTML',()=>{
 for(const [header,mime] of [['ID3','audio/mpeg'],['RIFF0000WAVE','audio/wav'],['OggS','audio/ogg'],['fLaC','audio/flac'],['0000ftypM4A ','audio/mp4']])assert.equal(audioMime(Buffer.from(header.padEnd(20,'\0'))),mime);
 assert.equal(audioMime(Buffer.from('<html>not audio</html>')),null);
 assert.equal(audioMime(Buffer.from('RIFF0000WEBP0000')),null);
});
test('Byte ranges support seeking, suffixes and clamping',()=>{
 assert.deepEqual(audioRange(null,100),{start:0,end:99,partial:false});
 assert.deepEqual(audioRange('bytes=20-39',100),{start:20,end:39,partial:true});
 assert.deepEqual(audioRange('bytes=90-',100),{start:90,end:99,partial:true});
 assert.deepEqual(audioRange('bytes=-10',100),{start:90,end:99,partial:true});
 assert.deepEqual(audioRange('bytes=90-999',100),{start:90,end:99,partial:true});
 for(const header of ['bytes=100-','bytes=30-20','bytes=-0','bytes=-','bytes=0-1,5-6','bad'])assert.equal(audioRange(header,100),null);
});
test('Audio markup renders a native player between article paragraphs',()=>{
 const content='Перед записью.'+audioMarkdown('Запись [класса].mp3','/api/audio/12345678-1234-1234-1234-123456789abc')+'После записи.';
 const html=renderToStaticMarkup(createElement(WikiProvider,null,createElement(Markdown,{content})));
 assert.match(html,/<audio controls="" preload="none"/);assert.match(html,/Запись класса.mp3/);
 assert.match(html,/Перед записью/);assert.match(html,/После записи/);assert.doesNotMatch(html,/autoplay/i);
});
