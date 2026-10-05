export const MAX_VIDEO_BYTES = 3 * 1024 * 1024;
export { AUDIO_CHUNK_BYTES as VIDEO_CHUNK_BYTES, audioRange as videoRange } from './audio';

export function videoMime(bytes: Uint8Array): string | null {
  if (bytes.length < 16) return null;
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (text(4, 8) === 'ftyp' && ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(text(8, 12))) return 'video/mp4';
  // WebM must have both the EBML header and the WebM document type.
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    for (let i = 4; i < Math.min(bytes.length - 6, 4096); i++) {
      if (bytes[i] === 0x42 && bytes[i + 1] === 0x82 && bytes[i + 2] === 0x84 && text(i + 3, i + 7) === 'webm') return 'video/webm';
    }
  }
  return null;
}

export function videoMarkdown(name: string, url: string) {
  const label = name.replace(/[\[\]\\\r\n]/g, '').trim() || 'Видеозапись';
  return `\n\n[${label}](${url} "video")\n\n`;
}
