import 'server-only';

export function configured() {
  return Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
}
export async function redis<T>(...command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('UPSTASH_NOT_CONFIGURED');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('REDIS_UNAVAILABLE');
  const data = await response.json();
  if (data.error) throw new Error('REDIS_COMMAND_FAILED');
  return data.result as T;
}
