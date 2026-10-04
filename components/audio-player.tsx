'use client';
import { useState } from 'react';
export function AudioPlayer({src,children}:{src:string;children:React.ReactNode}){
 const [error,setError]=useState(false);
 return <span className="wiki-audio"><span className="wiki-audio-title">♫ {children}</span><audio controls preload="none" src={src} aria-label="Аудиозапись статьи" onError={()=>setError(true)}>Ваш браузер не поддерживает аудиоплеер.</audio>{error&&<span className="wiki-audio-error">Не удалось воспроизвести запись. Попробуйте открыть файл отдельно.</span>}<a href={src} target="_blank" rel="noopener noreferrer">Открыть аудиофайл ↗</a></span>;
}
