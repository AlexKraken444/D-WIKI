import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {videoMime,videoMarkdown} from '../lib/video';
import {WikiProvider} from '../components/wiki-provider';
import {Markdown} from '../components/markdown';

test('Video headers accept MP4 and WebM but reject other file types',()=>{
  assert.equal(videoMime(Buffer.from('0000ftypisom0000')), 'video/mp4');
  const webm=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0x82,0x84]),Buffer.from('webm0000')]);
  assert.equal(videoMime(webm), 'video/webm');
  for(const value of ['<html>not video</html>','0000ftypM4A 0000','RIFF0000WEBP00000']) assert.equal(videoMime(Buffer.from(value)),null);
  assert.equal(videoMime(webm.subarray(0,8)),null);
});

test('Video appears between paragraphs with controls and no autoplay',()=>{
  const content='До видео.'+videoMarkdown('Класс [2026].mp4','/api/video/12345678-1234-1234-1234-123456789abc')+'После видео.';
  const html=renderToStaticMarkup(createElement(WikiProvider,null,createElement(Markdown,{content})));
  assert.match(html,/<video controls="" playsInline="" preload="none"/);
  assert.match(html,/Класс 2026.mp4/);
  assert.match(html,/До видео/);assert.match(html,/После видео/);
  assert.doesNotMatch(html,/autoplay/i);
});

test('External video markers remain ordinary links',()=>{
  const content=videoMarkdown('Видео','https://example.com/clip.mp4');
  const html=renderToStaticMarkup(createElement(WikiProvider,null,createElement(Markdown,{content})));
  assert.doesNotMatch(html,/<video/);
});
