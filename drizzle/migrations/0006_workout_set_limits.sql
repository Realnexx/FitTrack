-- Enforce planned set limits even across concurrent browser tabs.
create or replace function public.guard_workout_set_limit() returns trigger
language plpgsql security invoker set search_path=public as $$
declare parent public.workout_session_exercises; logged int;
begin
 if TG_OP='UPDATE' then
   if new.workout_session_exercise_id<>old.workout_session_exercise_id then raise exception 'A saved set cannot be moved to another exercise'; end if;
   return new;
 end if;
 select * into parent from workout_session_exercises where id=new.workout_session_exercise_id for update;
 if not found then raise exception 'Exercise not found'; end if;
 select count(*) into logged from workout_sets where workout_session_exercise_id=parent.id;
 if parent.status<>'pending' or logged>=parent.target_sets then raise exception 'Exercise is complete or unavailable. No more sets can be added.'; end if;
 return new;
end; $$;
create trigger workout_set_limit before insert or update on public.workout_sets for each row execute function public.guard_workout_set_limit();
create or replace function public.sync_exercise_set_completion() returns trigger
language plpgsql security invoker set search_path=public as $$
declare parent_id uuid; logged int; planned int;
begin
 parent_id:=case when TG_OP='DELETE' then old.workout_session_exercise_id else new.workout_session_exercise_id end;
 select target_sets into planned from workout_session_exercises where id=parent_id for update;
 select count(*) into logged from workout_sets where workout_session_exercise_id=parent_id;
 if logged>=planned then
   update workout_session_exercises set status='completed' where id=parent_id;
 elsif TG_OP='DELETE' then
   update workout_session_exercises set status='pending' where id=parent_id and status='completed';
 end if;
 return null;
end; $$;
create trigger workout_set_completion after insert or delete on public.workout_sets for each row execute function public.sync_exercise_set_completion();
-- Mark existing fully recorded exercises without discarding any saved sets.
update public.workout_session_exercises e set status='completed'
where e.status='pending' and (select count(*) from public.workout_sets s where s.workout_session_exercise_id=e.id)>=e.target_sets;
NOTIFY pgrst,'reload schema';
