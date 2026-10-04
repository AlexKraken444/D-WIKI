// One atomic operation: ownership, stale edits, unique titles, and the write.
export const saveArticleScript = `
local previous = redis.call('HGET', KEYS[1], ARGV[1])
local next = cjson.decode(ARGV[2])
if ARGV[3] == 'edit' then
  if not previous then return 'missing' end
  local old = cjson.decode(previous)
  if old.author_id ~= next.author_id and ARGV[6] ~= 'moderator' then return 'forbidden' end
  if old.updated_at ~= ARGV[4] then return 'stale' end
elseif previous then return 'conflict' end
local taken = redis.call('HGET', KEYS[2], ARGV[5])
if taken and taken ~= ARGV[1] then return 'duplicate' end
if previous then
  local old = cjson.decode(previous)
  if old.title_key ~= ARGV[5] then redis.call('HDEL', KEYS[2], old.title_key) end
  next.created_at = old.created_at
  next.author_id = old.author_id
end
next.approved = false
next.title_key = ARGV[5]
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(next))
redis.call('HSET', KEYS[2], ARGV[5], ARGV[1])
return 'ok'
`;
