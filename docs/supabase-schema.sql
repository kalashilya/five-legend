-- «Пятёрка Легенд»: таблицы для аккаунтов, облачного сохранения и рейтинга игроков.
-- Запустить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен.

-- 1. Сохранения: у каждого игрока одна строка, видит и меняет только он сам
create table if not exists public.saves (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint saves_size check (pg_column_size(data) < 400000)
);
alter table public.saves enable row level security;
drop policy if exists "saves: read own" on public.saves;
drop policy if exists "saves: insert own" on public.saves;
drop policy if exists "saves: update own" on public.saves;
create policy "saves: read own" on public.saves for select to authenticated using ((select auth.uid()) = id);
create policy "saves: insert own" on public.saves for insert to authenticated with check ((select auth.uid()) = id);
create policy "saves: update own" on public.saves for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
grant select, insert, update on public.saves to authenticated;

-- 2. Рейтинг: ник, кубки, уровень — видят все, меняет только владелец
create table if not exists public.leaders (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 3 and 16),
  tro integer not null default 0 check (tro between 0 and 100000),
  best integer not null default 0 check (best between 0 and 100000),
  lvl integer not null default 1 check (lvl between 1 and 10000),
  w integer not null default 0,
  l integer not null default 0,
  updated_at timestamptz not null default now()
);
create unique index if not exists leaders_nick_key on public.leaders (lower(nick));
create index if not exists leaders_tro_idx on public.leaders (tro desc);
alter table public.leaders enable row level security;
drop policy if exists "leaders: read all" on public.leaders;
drop policy if exists "leaders: insert own" on public.leaders;
drop policy if exists "leaders: update own" on public.leaders;
create policy "leaders: read all" on public.leaders for select to anon, authenticated using (true);
create policy "leaders: insert own" on public.leaders for insert to authenticated with check ((select auth.uid()) = id);
create policy "leaders: update own" on public.leaders for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
grant select on public.leaders to anon, authenticated;
grant insert, update on public.leaders to authenticated;
