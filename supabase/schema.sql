-- Run once in the Supabase SQL Editor. Enable Authentication > Anonymous Sign-ins.
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  content text not null check (char_length(trim(content)) between 30 and 100000),
  cover text not null default '' check (cover = '' or cover ~ '^https?://'),
  category text not null check (category in ('Наука','Технологии','Искусство','Природа','История','Культура')),
  author_id uuid not null default auth.uid() references auth.users(id),
  author_name text not null check (char_length(trim(author_name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index articles_title_unique on public.articles(lower(trim(title)));
create index articles_created_at on public.articles(created_at desc);
create index articles_author on public.articles(author_id);
alter table public.articles enable row level security;
revoke all on public.articles from anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert on public.articles to authenticated;
grant update(title, excerpt, content, cover, category, author_name, updated_at) on public.articles to authenticated;
create policy "Public reading" on public.articles for select to anon, authenticated using (true);
create policy "Authors create their articles" on public.articles for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Authors edit their articles" on public.articles for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create function public.set_article_dates() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then NEW.created_at = now(); end if;
  NEW.updated_at = now();
  return NEW;
end;
$$;
create trigger article_dates before insert or update on public.articles for each row execute function public.set_article_dates();
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']);
create policy "Authors upload images" on storage.objects for insert to authenticated with check (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Public bucket serves images by URL. No write, overwrite or delete permission for other users.
