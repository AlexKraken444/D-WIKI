import {videoMime} from './video';

export async function uploadVideoFile(file: File, progress: (percent: number) => void) {
  if (!file.size) throw new Error('Выберите непустой видеофайл.');
  if (!videoMime(new Uint8Array(await file.slice(0,4096).arrayBuffer()))) throw new Error('Поддерживаются MP4 и WebM.');
  async function send(url: string, body?: Blob) {
    for (let attempt=0; attempt<3; attempt++) {
      try {
        const response=await fetch(url,{method:'POST',body,signal:AbortSignal.timeout(60000)});
        const data=await response.json().catch(()=>({error:'Ошибка загрузки видео.'}));
        if (!response.ok) {
          if (response.status>=500 && attempt<2) continue;
          throw new Error(data.error || 'Ошибка загрузки видео.');
        }
        return data;
      } catch(error) {
        if (attempt===2 || (error instanceof Error && error.name!=='TypeError' && error.name!=='TimeoutError')) throw error;
      }
    }
    throw new Error('Не удалось загрузить видео.');
  }
  const {id,chunkSize}=await send(`/api/video?action=start&size=${file.size}`);
  if (!Number.isSafeInteger(chunkSize) || chunkSize<=0 || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('Неверный ответ сервера.');
  for (let offset=0,index=0; offset<file.size; offset+=chunkSize,index++) {
    await send(`/api/video?action=chunk&id=${id}&index=${index}`,file.slice(offset,offset+chunkSize));
    progress(Math.min(99,Math.floor(Math.min(file.size,offset+chunkSize)/file.size*100)));
  }
  const result=await send(`/api/video?action=finish&id=${id}`);
  progress(100);
  return result.url as string;
}
