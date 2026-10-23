-- Apply after 0002_account_requests.sql. Saves profile, goal and chosen schedule atomically.
create or replace function public.complete_onboarding(payload jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare u uuid := auth.uid(); days int[]; a_id uuid; b_id uuid; day_number int; position int;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text, 0));
 if exists(select 1 from profiles where id=u and onboarding_completed) then return; end if;
 if coalesce(trim(payload->>'full_name'),'')='' then raise exception 'Name is required'; end if;
 if (payload->>'date_of_birth')::date > current_date or (payload->>'date_of_birth')::date < current_date - interval '101 years' then raise exception 'Invalid date of birth'; end if;
 if coalesce((payload->>'height_cm')::numeric,0)<51 or (payload->>'height_cm')::numeric>279 then raise exception 'Enter a valid height'; end if;
 if payload->>'date_of_birth' is null or (payload->>'date_of_birth')::date > current_date - interval '13 years' then raise exception 'You must be at least 13 years old'; end if;
 if coalesce(payload->>'workout_location','')='' or coalesce(payload->>'activity_level','') not in ('sedentary','light','moderate','active','very_active') or coalesce(payload->>'experience_level','') not in ('beginner','intermediate','advanced') then raise exception 'Complete your training preferences'; end if;
 if jsonb_typeof(payload->'equipment') is distinct from 'array' or jsonb_typeof(payload->'preferred_days') is distinct from 'array' then raise exception 'Choose equipment and training days'; end if;
 if jsonb_array_length(payload->'equipment')=0 or exists(select 1 from jsonb_array_elements_text(payload->'equipment') e(value) where value not in ('Bodyweight','Dumbbells','Resistance Bands','Other')) then raise exception 'Choose valid equipment'; end if;
 select array_agg(distinct value::int order by value::int) into days from jsonb_array_elements_text(payload->'preferred_days') d(value);
 if coalesce(cardinality(days),0)=0 or exists(select 1 from unnest(days) d where d<0 or d>6) then raise exception 'Choose valid training days'; end if;
 if (payload->>'goal_type' in ('gain_weight','build_muscle') and ((payload->>'target_weight_kg')::numeric <= (payload->>'starting_weight_kg')::numeric or (payload->>'weekly_weight_change_target_kg')::numeric <= 0)) or (payload->>'goal_type'='lose_weight' and ((payload->>'target_weight_kg')::numeric >= (payload->>'starting_weight_kg')::numeric or (payload->>'weekly_weight_change_target_kg')::numeric >= 0)) or (payload->>'goal_type'='maintain' and ((payload->>'target_weight_kg')::numeric <> (payload->>'starting_weight_kg')::numeric or (payload->>'weekly_weight_change_target_kg')::numeric <> 0)) then raise exception 'Targets must match the goal direction'; end if;
 update fitness_goals set status='archived' where user_id=u and status='active';
 insert into fitness_goals(user_id,goal_type,starting_weight_kg,target_weight_kg,weekly_weight_change_target_kg,daily_calorie_target,daily_protein_target_g,start_date)
 values(u,payload->>'goal_type',(payload->>'starting_weight_kg')::numeric,(payload->>'target_weight_kg')::numeric,(payload->>'weekly_weight_change_target_kg')::numeric,(payload->>'daily_calorie_target')::int,(payload->>'daily_protein_target_g')::int,(payload->>'start_date')::date);
 insert into profiles(id,full_name,date_of_birth,height_cm,sex,activity_level,experience_level,workout_location,equipment,preferred_days,onboarding_completed)
 values(u,payload->>'full_name',(payload->>'date_of_birth')::date,(payload->>'height_cm')::numeric,nullif(payload->>'sex',''),payload->>'activity_level',payload->>'experience_level',payload->>'workout_location',array(select jsonb_array_elements_text(payload->'equipment')),days,true)
 on conflict(id) do update set full_name=excluded.full_name,date_of_birth=excluded.date_of_birth,height_cm=excluded.height_cm,sex=excluded.sex,activity_level=excluded.activity_level,experience_level=excluded.experience_level,workout_location=excluded.workout_location,equipment=excluded.equipment,preferred_days=excluded.preferred_days,onboarding_completed=true;
 select id into a_id from workout_plans where user_id=u and name='Workout A' order by created_at limit 1;
 select id into b_id from workout_plans where user_id=u and name='Workout B' order by created_at limit 1;
 if a_id is null or b_id is null then raise exception 'Starter workout plans are missing. Contact support before completing onboarding.'; end if;
 delete from workout_schedule where user_id=u;
 position := 0;
 foreach day_number in array days loop
   insert into workout_schedule(user_id,workout_plan_id,day_of_week,week_parity,effective_from) values
   (u,case when position % 2=0 then a_id else b_id end,day_number,'odd',(payload->>'start_date')::date),
   (u,case when position % 2=0 then b_id else a_id end,day_number,'even',(payload->>'start_date')::date);
   position := position + 1;
 end loop;
end; $$;


revoke all on function public.complete_onboarding(jsonb) from public;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
NOTIFY pgrst, 'reload schema';
