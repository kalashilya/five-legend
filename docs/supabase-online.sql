-- «Пятёрка Легенд» — друзья для онлайн-матчей.
-- Запустить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run. Повторный запуск безопасен.
-- Онлайн-матчи и «кто в игре» идут через Realtime (каналы broadcast/presence) и таблиц не требуют.

-- Дружба: a отправил заявку b; st = 'pending' (ждёт) или 'ok' (друзья). Видят и меняют только эти двое.
create table if not exists public.friends (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  st text not null default 'pending' check (st in ('pending', 'ok')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  constraint friends_not_self check (a <> b)
);
alter table public.friends enable row level security;
drop policy if exists "friends: read own" on public.friends;
drop policy if exists "friends: request" on public.friends;
drop policy if exists "friends: accept" on public.friends;
drop policy if exists "friends: remove" on public.friends;
create policy "friends: read own" on public.friends for select to authenticated using ((select auth.uid()) = a or (select auth.uid()) = b);
create policy "friends: request" on public.friends for insert to authenticated with check ((select auth.uid()) = a and st = 'pending');
create policy "friends: accept" on public.friends for update to authenticated using ((select auth.uid()) = b) with check ((select auth.uid()) = b and st = 'ok');
create policy "friends: remove" on public.friends for delete to authenticated using ((select auth.uid()) = a or (select auth.uid()) = b);
grant select, insert, update, delete on public.friends to authenticated;

-- Онлайн: «кто в игре» (каждый раз в 5 с отмечается) и сообщения матчей/приглашений. Повторный запуск безопасен.
create table if not exists public.net_here (
  uid uuid primary key references auth.users (id) on delete cascade,
  nick text not null default '',
  st text not null default 'idle',
  v text not null default '',
  t bigint not null default 0,
  seen timestamptz not null default now()
);
create or replace function public.net_here_seen() returns trigger language plpgsql as $$ begin new.seen := now(); return new; end $$;
drop trigger if exists net_here_seen on public.net_here;
create trigger net_here_seen before insert or update on public.net_here for each row execute function public.net_here_seen();
alter table public.net_here enable row level security;
drop policy if exists "here: read" on public.net_here;
drop policy if exists "here: write own" on public.net_here;
drop policy if exists "here: update own" on public.net_here;
drop policy if exists "here: delete own" on public.net_here;
create policy "here: read" on public.net_here for select to authenticated using (true);
create policy "here: write own" on public.net_here for insert to authenticated with check ((select auth.uid()) = uid);
create policy "here: update own" on public.net_here for update to authenticated using ((select auth.uid()) = uid) with check ((select auth.uid()) = uid);
create policy "here: delete own" on public.net_here for delete to authenticated using ((select auth.uid()) = uid);
grant select, insert, update, delete on public.net_here to authenticated;

create table if not exists public.net_msgs (
  id bigint generated always as identity primary key,
  ch text not null check (char_length(ch) < 80),
  ev text not null check (char_length(ev) < 20),
  p jsonb not null default '{}'::jsonb,
  frm uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  constraint net_msgs_size check (pg_column_size(p) < 60000)
);
create index if not exists net_msgs_ch_id on public.net_msgs (ch, id);
alter table public.net_msgs enable row level security;
drop policy if exists "msgs: read" on public.net_msgs;
drop policy if exists "msgs: send" on public.net_msgs;
drop policy if exists "msgs: delete own" on public.net_msgs;
create policy "msgs: read" on public.net_msgs for select to authenticated using (true);
create policy "msgs: send" on public.net_msgs for insert to authenticated with check ((select auth.uid()) = frm);
create policy "msgs: delete own" on public.net_msgs for delete to authenticated using ((select auth.uid()) = frm);
grant select, insert, delete on public.net_msgs to authenticated;
