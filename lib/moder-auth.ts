import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redis } from './redis';
const cookieName = 'd-wiki-moder';
function key(token: string) { return `dw:moder-session:${createHash('sha256').update(token).digest('hex')}`; }
export async function isModerator() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return (await redis<string|null>('GET', key(token))) === 'moderator';
}
export async function endModeratorSession() {
  const jar = await cookies(); const token = jar.get(cookieName)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) await redis('DEL', key(token));
  jar.delete(cookieName);
}
export async function startModeratorSession() {
  await endModeratorSession();
  const token = randomBytes(32).toString('hex');
  await redis('SET', key(token), 'moderator', 'EX', 28800);
  (await cookies()).set(cookieName, token, {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:28800});
}
