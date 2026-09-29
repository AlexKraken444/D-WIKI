'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state"><h1>Не получилось открыть страницу</h1><p>Попробуйте загрузить её ещё раз.</p><button className="button dark" onClick={reset}>Повторить</button></div>;}
