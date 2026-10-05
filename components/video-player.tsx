'use client';
import { useState } from 'react';

export function VideoPlayer({src, children}: {src: string; children: React.ReactNode}) {
  const [error, setError] = useState(false);
  return <span className="wiki-audio wiki-video">
    <span className="wiki-audio-title">{children}</span>
    <video controls playsInline preload="none" src={src} aria-label="Видеозапись статьи" onError={() => setError(true)}>Ваш браузер не поддерживает видеоплеер.</video>
    {error && <span className="wiki-audio-error">Не удалось воспроизвести видео. Попробуйте открыть файл отдельно или загрузить MP4 с кодеком H.264.</span>}
    <a href={src} target="_blank" rel="noopener noreferrer">Открыть видеофайл ↗</a>
  </span>;
}
