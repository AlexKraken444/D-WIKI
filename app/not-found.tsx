import Link from 'next/link';
export default function NotFound(){return <div className="empty-state"><div className="eyebrow">404 · НЕИЗВЕДАННАЯ ТЕРРИТОРИЯ</div><h1>Этой страницы пока нет.</h1><p>Но впереди ещё много интересного.</p><Link href="/" className="button dark">Вернуться к открытиям</Link></div>;}
