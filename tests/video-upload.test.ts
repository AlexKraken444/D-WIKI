import {test} from 'node:test';
import assert from 'node:assert/strict';
import {uploadVideoFile} from '../lib/upload-video';
import {VIDEO_UPLOAD_CHUNK_BYTES} from '../lib/video';

test('Video larger than 3 MB uploads in bounded parts, retries and publishes last',async()=>{
 const original=globalThis.fetch;
 const bytes=new Uint8Array(5*1024*1024+17);bytes.set(Buffer.from('0000ftypisom0000'));
 const file=new File([bytes],'large.mp4');
 const id='12345678-1234-1234-1234-123456789abc';
 let received=0,index=0,retried=false,finished=false;
 const progress:number[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input),'https://example.com');
  switch(url.searchParams.get('action')){
   case 'start':assert.equal(Number(url.searchParams.get('size')),file.size);return Response.json({id,chunkSize:VIDEO_UPLOAD_CHUNK_BYTES});
   case 'chunk':{
    assert.equal(Number(url.searchParams.get('index')),index);
    const part=init?.body as Blob;assert.ok(part.size<=VIDEO_UPLOAD_CHUNK_BYTES);
    if(index===1&&!retried){retried=true;return Response.json({error:'Temporary'},{status:503});}
    assert.deepEqual(new Uint8Array(await part.arrayBuffer()),bytes.slice(received,received+part.size));
    received+=part.size;index++;return Response.json({ok:true});
   }
   case 'finish':assert.equal(received,file.size);finished=true;return Response.json({url:`/api/video/${id}`});
   default:throw new Error('Unexpected request');
  }
 };
 try{
  assert.equal(await uploadVideoFile(file,p=>progress.push(p)),`/api/video/${id}`);
  assert.ok(retried&&finished);assert.equal(progress.at(-1),100);
  assert.ok(progress.slice(0,-1).every(p=>p<100));
 }finally{globalThis.fetch=original;}
});

test('Failed chunk never publishes an incomplete video',async()=>{
 const original=globalThis.fetch;let finished=false;
 globalThis.fetch=async(input)=>{
  const url=String(input);
  if(url.includes('action=start'))return Response.json({id:'12345678-1234-1234-1234-123456789abc',chunkSize:VIDEO_UPLOAD_CHUNK_BYTES});
  if(url.includes('action=finish'))finished=true;
  return Response.json({error:'Storage full'},{status:503});
 };
 try{
  await assert.rejects(()=>uploadVideoFile(new File([Buffer.from('0000ftypisom0000')],'clip.mp4'),()=>{}),/Storage full/);
  assert.equal(finished,false);
 }finally{globalThis.fetch=original;}
});
