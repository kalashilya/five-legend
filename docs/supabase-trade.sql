-- «Пятёрка Легенд» — трейды: передача дубликатов карточек другу.
-- Запустить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run. Повторный запуск безопасен.
-- Отправить можно только другу (запись friends со статусом ok), от 1 до 5 копий.
-- Получатель меняет pending → accepted / declined, отправитель — pending → cancelled и declined → returned.
-- Менять можно только статус и время ответа; набор карточек после отправки не меняется.
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  frm uuid not null references auth.users (id) on delete cascade,
  rcv uuid not null references auth.users (id) on delete cascade,
  frm_nick text not null default '',
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) between 1 and 5 and pg_column_size(cards) < 2000),
  st text not null default 'pending' check (st in ('pending', 'accepted', 'declined', 'cancelled', 'returned')),
  created_at timestamptz not null default now(),
  done_at timestamptz,
  constraint trades_not_self check (frm <> rcv)
);
create index if not exists trades_rcv on public.trades (rcv, created_at desc);
create index if not exists trades_frm on public.trades (frm, created_at desc);
alter table public.trades enable row level security;
drop policy if exists "trades: read own" on public.trades;
drop policy if exists "trades: send to friend" on public.trades;
drop policy if exists "trades: answer" on public.trades;
drop policy if exists "trades: take back" on public.trades;
create policy "trades: read own" on public.trades for select to authenticated using ((select auth.uid()) = frm or (select auth.uid()) = rcv);
create policy "trades: send to friend" on public.trades for insert to authenticated with check (
  (select auth.uid()) = frm and st = 'pending'
  and exists (select 1 from public.friends f where f.st = 'ok' and ((f.a = frm and f.b = rcv) or (f.a = rcv and f.b = frm)))
);
create policy "trades: answer" on public.trades for update to authenticated
  using ((select auth.uid()) = rcv and st = 'pending') with check ((select auth.uid()) = rcv and st in ('accepted', 'declined'));
create policy "trades: take back" on public.trades for update to authenticated
  using ((select auth.uid()) = frm and st in ('pending', 'declined')) with check ((select auth.uid()) = frm and st in ('cancelled', 'returned'));
grant select, insert on public.trades to authenticated;
grant update (st, done_at) on public.trades to authenticated;
