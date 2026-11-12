-- «Пятёрка Легенд» — общий список игроков виден только владельцу игры.
-- Запустить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run. Повторный запуск безопасен.
-- После этого каждый игрок видит в таблице leaders только себя, своих друзей и тех, с кем есть заявка в друзья;
-- владелец (аккаунт kalash) видит всех. Найти друга по нику можно через функцию find_player (точный ник).

drop policy if exists "leaders: read all" on public.leaders;
drop policy if exists "leaders: read own friends admin" on public.leaders;
create policy "leaders: read own friends admin" on public.leaders for select to authenticated using (
  (select auth.uid()) = id
  or (select auth.uid()) = '33a107e3-b72d-4111-b0dc-60835d86ac2c'::uuid
  or exists (select 1 from public.friends f where (f.a = (select auth.uid()) and f.b = leaders.id) or (f.b = (select auth.uid()) and f.a = leaders.id))
);
revoke select on public.leaders from anon;
grant select on public.leaders to authenticated;

create or replace function public.find_player(q text) returns table (id uuid, nick text)
language sql stable security definer set search_path = public as $$
  select l.id, l.nick from public.leaders l where lower(l.nick) = lower(q) limit 1
$$;
revoke all on function public.find_player(text) from public, anon;
grant execute on function public.find_player(text) to authenticated;
