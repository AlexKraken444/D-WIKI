import { scryptSync, timingSafeEqual } from 'node:crypto';
// Salted hash only: the configured password never enters the client bundle.
const fallback = '4fde292ebbeb696646441256d6f2f356:d7eb1cd8e8846a7a78346af030e51eaeff07d3723194ce314579a46995d807ee133dc065989a5981924eaf117fa16ec2dad722330f12df597d6d1d55e74bc235';
export function validModeratorPassword(value: unknown) {
  if (typeof value !== 'string' || value.length > 256) return false;
  const [salt, hash] = (process.env.MODERATOR_PASSWORD_HASH || fallback).split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  return timingSafeEqual(scryptSync(value, salt, 64), Buffer.from(hash, 'hex'));
}
