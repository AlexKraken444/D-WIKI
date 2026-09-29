import { Suspense } from 'react';
import { Editor } from '@/components/editor';
export const metadata={title:'Создать статью'};
export default function Page(){return <Suspense fallback={<div className="loading">Открываем редактор…</div>}><Editor/></Suspense>;}
