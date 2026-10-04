export const moderateArticleScript = `
local raw = redis.call('HGET',KEYS[1],ARGV[1])
if not raw then return 'missing' end
local article = cjson.decode(raw)
if article.updated_at ~= ARGV[2] then return 'stale' end
if ARGV[3] == 'delete' then
  redis.call('SET',KEYS[3],raw,'EX',2592000)
  redis.call('HDEL',KEYS[1],ARGV[1])
  if article.title_key then redis.call('HDEL',KEYS[2],article.title_key) end
else
  article.approved = ARGV[3] == 'approve'
  article.updated_at = ARGV[4]
  redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(article))
end
return 'ok'
`;
