-- «Пятёрка Легенд» — профиль: аватар и то, что видят друзья (коллекция, состав).
-- Запустить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run. Повторный запуск безопасен.
alter table public.leaders add column if not exists ava integer not null default 0 check (ava between 0 and 99);
alter table public.leaders add column if not exists pub jsonb check (pub is null or pg_column_size(pub) < 4000);
