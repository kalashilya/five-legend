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
