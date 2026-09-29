import { Suspense } from 'react';
import { Feed } from '@/components/feed';
export default function Home(){return <Suspense fallback={<div className="loading">Открываем мир знаний…</div>}><Feed/></Suspense>;}
