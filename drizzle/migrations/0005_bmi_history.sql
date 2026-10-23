-- Immutable BMI snapshots preserve the inputs used for each result.
create table public.bmi_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weight_kg double precision not null check(weight_kg between 20 and 500),
  height_cm double precision not null check(height_cm between 100 and 250),
  bmi double precision generated always as (weight_kg / power(height_cm / 100.0, 2)) stored,
  adult_confirmed boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index bmi_logs_user_date on public.bmi_logs(user_id,recorded_at desc,id desc);
alter table public.bmi_logs enable row level security;
create policy "Read own BMI history" on public.bmi_logs for select to authenticated using(user_id=auth.uid());
create policy "Save own BMI" on public.bmi_logs for insert to authenticated with check(user_id=auth.uid());
grant select,insert on public.bmi_logs to authenticated;
NOTIFY pgrst, 'reload schema';
