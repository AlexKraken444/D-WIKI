'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle(){
  const [dark,setDark]=useState(false);
  useEffect(()=>{setDark(document.documentElement.dataset.theme==='dark');},[]);
  function toggle(){const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('d-wiki-theme',next?'dark':'light');}catch{}}
  return <button className="button theme-toggle" onClick={toggle} aria-label={dark?'Включить белую тему':'Включить чёрную тему'} aria-pressed={dark}>{dark?<Sun size={17}/>:<Moon size={17}/>}<span>{dark?'Белая тема':'Чёрная тема'}</span></button>;
}
