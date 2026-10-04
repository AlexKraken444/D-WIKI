export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
export const AUDIO_CHUNK_BYTES = 48 * 1024;
export function audioMime(bytes: Uint8Array): string | null {
  const text = (start:number,end:number) => String.fromCharCode(...bytes.slice(start,end));
  if (bytes.length < 12) return null;
  if (text(0,3)==='ID3' || (bytes[0]===255 && (bytes[1]&224)===224 && (bytes[1]&6)!==0 && (bytes[2]&240)!==240 && (bytes[2]&12)!==12)) return 'audio/mpeg';
  if (text(0,4)==='RIFF' && text(8,12)==='WAVE') return 'audio/wav';
  if (text(0,4)==='OggS') return 'audio/ogg';
  if (text(0,4)==='fLaC') return 'audio/flac';
  if (text(4,8)==='ftyp' && ['M4A ','M4B ','isom','mp42'].includes(text(8,12))) return 'audio/mp4';
  return null;
}
export function audioRange(header:string|null,size:number): {start:number;end:number;partial:boolean}|null {
  if(!header)return {start:0,end:size-1,partial:false};
  const match=/^bytes=(\d*)-(\d*)$/.exec(header);
  if(!match || (!match[1]&&!match[2]))return null;
  let start:number,end:number;
  if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return null;start=Math.max(0,size-suffix);end=size-1;}
  else {start=Number(match[1]);end=match[2]?Number(match[2]):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return null;
  return {start,end:Math.min(end,size-1),partial:true};
}
export function audioMarkdown(name:string,url:string){
  const label=name.replace(/[\[\]\\\r\n]/g,'').trim()||'Аудиозапись';
  return `\n\n[${label}](${url} "audio")\n\n`;
}
