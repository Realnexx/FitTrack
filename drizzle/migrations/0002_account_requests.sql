create table public.account_deletion_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
 requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in('pending','cancelled'))
);
alter table public.account_deletion_requests enable row level security;
grant select,insert,update on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;
create policy "own deletion requests" on public.account_deletion_requests for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Called only by a trusted operator after confirming the pending request.
-- No service credentials or privileged deletion rights are exposed to the browser.
create or replace function public.fulfill_account_deletion(target_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
 if not exists(select 1 from public.account_deletion_requests where user_id=target_user and status='pending') then raise exception 'No pending deletion request'; end if;
 delete from public.workout_sets where user_id=target_user;
 delete from public.workout_session_exercises where user_id=target_user;
 delete from public.workout_sessions where user_id=target_user;
 delete from public.workout_schedule where user_id=target_user;
 delete from public.workout_plan_exercises where user_id=target_user;
 delete from public.workout_plans where user_id=target_user;
 delete from public.food_logs where user_id=target_user;
 delete from public.foods where created_by=target_user and not is_system_food;
 delete from public.exercises where created_by=target_user and not is_system_exercise;
 delete from public.weight_logs where user_id=target_user;
 delete from public.fitness_goals where user_id=target_user;
 delete from public.user_settings where user_id=target_user;
 delete from public.profiles where id=target_user;
 delete from auth.users where id=target_user;
end; $$;
revoke all on function public.fulfill_account_deletion(uuid) from public,authenticated,anon;
grant execute on function public.fulfill_account_deletion(uuid) to service_role;
