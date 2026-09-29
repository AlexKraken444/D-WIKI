import type { Metadata } from 'next';
import { WikiProvider } from '@/components/wiki-provider';
import { Shell } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = { title: { default: 'D WIKI — любопытство объединяет', template: '%s · D WIKI' }, description: 'Открытая энциклопедия нового поколения. Читайте, исследуйте и делитесь знаниями.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><WikiProvider><Shell>{children}</Shell></WikiProvider></body></html>;
}
