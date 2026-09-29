import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redis } from './redis';
export async function author(create = false) {
  const jar = await cookies();
  let token = jar.get('d-wiki-owner')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) return null;
    token = randomBytes(32).toString('hex');
    jar.set('d-wiki-owner', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 * 2 });
  }
  return createHash('sha256').update(token).digest('hex');
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function allowed(id: string, action: string, limit: number) {
  const count = await redis<number>('EVAL', "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 3600) end; return n", 1, `dw:rate:${action}:${id}`);
  return count <= limit;
}
