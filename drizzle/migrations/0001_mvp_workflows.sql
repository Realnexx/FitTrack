-- Apply after 0000_migration.sql. All functions run with the caller's RLS permissions.
create or replace function public.complete_onboarding(payload jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare u uuid := auth.uid();
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text, 0));
 if exists(select 1 from profiles where id=u and onboarding_completed) then return; end if;
 if coalesce(trim(payload->>'full_name'),'')='' then raise exception 'Name is required'; end if;
 if (payload->>'date_of_birth')::date > current_date or (payload->>'date_of_birth')::date < current_date - interval '101 years' then raise exception 'Invalid date of birth'; end if;
 update fitness_goals set status='archived' where user_id=u and status='active';
 insert into fitness_goals(user_id,goal_type,starting_weight_kg,target_weight_kg,weekly_weight_change_target_kg,daily_calorie_target,daily_protein_target_g,start_date)
 values(u,payload->>'goal_type',(payload->>'starting_weight_kg')::numeric,(payload->>'target_weight_kg')::numeric,(payload->>'weekly_weight_change_target_kg')::numeric,(payload->>'daily_calorie_target')::int,(payload->>'daily_protein_target_g')::int,(payload->>'start_date')::date);
 insert into profiles(id,full_name,date_of_birth,height_cm,sex,activity_level,experience_level,workout_location,equipment,preferred_days,onboarding_completed)
 values(u,payload->>'full_name',(payload->>'date_of_birth')::date,(payload->>'height_cm')::numeric,nullif(payload->>'sex',''),payload->>'activity_level',payload->>'experience_level',payload->>'workout_location',array(select jsonb_array_elements_text(payload->'equipment')),array(select jsonb_array_elements_text(payload->'preferred_days'))::int[],true)
 on conflict(id) do update set full_name=excluded.full_name,date_of_birth=excluded.date_of_birth,height_cm=excluded.height_cm,sex=excluded.sex,activity_level=excluded.activity_level,experience_level=excluded.experience_level,workout_location=excluded.workout_location,equipment=excluded.equipment,preferred_days=excluded.preferred_days,onboarding_completed=true;
end; $$;

create or replace function public.start_workout(plan_id uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare u uuid := auth.uid(); session_id uuid; plan_name text;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select id into session_id from workout_sessions where user_id=u and status='in_progress' order by started_at desc limit 1;
 if session_id is not null then return session_id; end if;
 select name into plan_name from workout_plans where id=plan_id and user_id=u for update;
 if plan_name is null then raise exception 'Plan not found'; end if;
 if not exists(select 1 from workout_plan_exercises where workout_plan_id=plan_id and user_id=u) then raise exception 'Add at least one exercise before starting'; end if;
 insert into workout_sessions(user_id,workout_plan_id,title) values(u,plan_id,plan_name) returning id into session_id;
 insert into workout_session_exercises(user_id,workout_session_id,exercise_id,exercise_order,target_sets,target_reps_min,target_reps_max,target_duration_seconds,rest_seconds)
 select u,session_id,exercise_id,exercise_order,target_sets,target_reps_min,target_reps_max,target_duration_seconds,rest_seconds from workout_plan_exercises where workout_plan_id=plan_id and user_id=u order by exercise_order;
 return session_id;
end; $$;

create or replace function public.reorder_plan_exercises(first_id uuid,second_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare a workout_plan_exercises; b workout_plan_exercises;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into a from workout_plan_exercises where id=first_id and user_id=auth.uid() for update;
 select * into b from workout_plan_exercises where id=second_id and user_id=auth.uid() for update;
 if a.id is null or b.id is null or a.workout_plan_id<>b.workout_plan_id then raise exception 'Exercises must belong to your same plan'; end if;
 update workout_plan_exercises set exercise_order=case when id=first_id then b.exercise_order else a.exercise_order end where id in(first_id,second_id);
end; $$;

create or replace function public.set_workout_day(plan_id uuid,day_number int,parity text) returns void
language plpgsql security invoker set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if not exists(select 1 from workout_plans where id=plan_id and user_id=auth.uid()) then raise exception 'Plan not found'; end if;
 if day_number not between 0 and 6 or parity not in('all','odd','even') then raise exception 'Invalid schedule'; end if;
 -- Each calendar day has one applicable plan. Preserve the opposite parity when possible.
 if parity<>'all' then
   insert into workout_schedule(user_id,workout_plan_id,day_of_week,week_parity,effective_from,effective_until)
   select user_id,workout_plan_id,day_of_week,case when parity='odd' then 'even' else 'odd' end,effective_from,effective_until from workout_schedule where user_id=auth.uid() and day_of_week=day_number and week_parity='all';
 end if;
 delete from workout_schedule where user_id=auth.uid() and day_of_week=day_number and (parity='all' or week_parity in('all',parity));
 insert into workout_schedule(user_id,workout_plan_id,day_of_week,week_parity) values(auth.uid(),plan_id,day_number,parity);
end; $$;

revoke all on function public.complete_onboarding(jsonb) from public;
revoke all on function public.start_workout(uuid) from public;
revoke all on function public.reorder_plan_exercises(uuid,uuid) from public;
revoke all on function public.set_workout_day(uuid,int,text) from public;
grant execute on function public.complete_onboarding(jsonb),public.start_workout(uuid),public.reorder_plan_exercises(uuid,uuid),public.set_workout_day(uuid,int,text) to authenticated;

-- Prevent referencing another user's private food or plan when creating a log/session.
drop policy "own food logs" on public.food_logs;
create policy "own food logs" on public.food_logs for all to authenticated using(auth.uid()=user_id)
 with check(auth.uid()=user_id and (food_id is null or exists(select 1 from public.foods f where f.id=food_id and (f.is_system_food or f.created_by=auth.uid()))));
drop policy "own sessions" on public.workout_sessions;
create policy "own sessions" on public.workout_sessions for all to authenticated using(auth.uid()=user_id)
 with check(auth.uid()=user_id and (workout_plan_id is null or exists(select 1 from public.workout_plans p where p.id=workout_plan_id and p.user_id=auth.uid())));
alter table public.workout_plan_exercises add constraint positive_plan_targets check(target_sets between 1 and 20 and rest_seconds between 0 and 900 and (target_reps_min is null or target_reps_min between 1 and 200) and (target_reps_max is null or target_reps_max>=target_reps_min) and (target_duration_seconds is null or target_duration_seconds between 1 and 3600));
-- A private exercise cannot be used as a foreign-key dependency by a different account.
drop policy "own plan exercises" on public.workout_plan_exercises;
create policy "own plan exercises" on public.workout_plan_exercises for all to authenticated using(auth.uid()=user_id)
 with check(auth.uid()=user_id and exists(select 1 from public.workout_plans p where p.id=workout_plan_id and p.user_id=auth.uid()) and exists(select 1 from public.exercises e where e.id=exercise_id and (e.is_system_exercise or e.created_by=auth.uid())));
drop policy "own session exercises" on public.workout_session_exercises;
create policy "own session exercises" on public.workout_session_exercises for all to authenticated using(auth.uid()=user_id)
 with check(auth.uid()=user_id and exists(select 1 from public.workout_sessions s where s.id=workout_session_id and s.user_id=auth.uid()) and exists(select 1 from public.exercises e where e.id=exercise_id and (e.is_system_exercise or e.created_by=auth.uid())));
