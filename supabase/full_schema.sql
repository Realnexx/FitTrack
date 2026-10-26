-- ==========================================
-- 1. BASE SCHEMA & SEED DATA
-- ==========================================

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  sex text check (sex in ('male','female','other')),
  height_cm numeric(5,1) check (height_cm > 50 and height_cm < 280),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  experience_level text check (experience_level in ('beginner','intermediate','advanced')),
  workout_location text,
  equipment text[] not null default '{}',
  preferred_days int[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- SETTINGS
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid(),
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  height_unit text not null default 'cm' check (height_unit in ('cm','ft')),
  timezone text not null default 'Asia/Manila',
  date_format text not null default 'MMM d, yyyy',
  theme text not null default 'dark',
  default_landing text not null default '/dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "own settings" on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger settings_updated before update on public.user_settings for each row execute function public.set_updated_at();

-- GOALS
create table public.fitness_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  goal_type text not null check (goal_type in ('gain_weight','build_muscle','maintain','lose_weight')),
  starting_weight_kg numeric(5,2) not null check (starting_weight_kg > 20 and starting_weight_kg < 400),
  target_weight_kg numeric(5,2) not null check (target_weight_kg > 20 and target_weight_kg < 400),
  weekly_weight_change_target_kg numeric(4,2) not null default 0.25 check (weekly_weight_change_target_kg between -2 and 2),
  daily_calorie_target int not null check (daily_calorie_target between 800 and 8000),
  daily_protein_target_g int not null check (daily_protein_target_g between 10 and 500),
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fitness_goals(user_id, status);
grant select, insert, update, delete on public.fitness_goals to authenticated;
grant all on public.fitness_goals to service_role;
alter table public.fitness_goals enable row level security;
create policy "own goals" on public.fitness_goals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger goals_updated before update on public.fitness_goals for each row execute function public.set_updated_at();

-- WEIGHT LOGS
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  weight_kg numeric(5,2) not null check (weight_kg > 20 and weight_kg < 400),
  measured_at timestamptz not null default now(),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.weight_logs(user_id, measured_at desc);
grant select, insert, update, delete on public.weight_logs to authenticated;
grant all on public.weight_logs to service_role;
alter table public.weight_logs enable row level security;
create policy "own weights" on public.weight_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger weights_updated before update on public.weight_logs for each row execute function public.set_updated_at();

-- EXERCISES
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  name text not null,
  description text,
  primary_muscle_group text not null,
  equipment text not null,
  instructions text,
  tracking_type text not null default 'reps' check (tracking_type in ('reps','time')),
  is_unilateral boolean not null default false,
  suggested_sets int not null default 3,
  suggested_reps text,
  is_system_exercise boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.exercises to authenticated;
grant all on public.exercises to service_role;
alter table public.exercises enable row level security;
create policy "read system or own exercises" on public.exercises for select to authenticated using (is_system_exercise or created_by = auth.uid());
create policy "insert own exercises" on public.exercises for insert to authenticated with check (created_by = auth.uid() and not is_system_exercise);
create policy "update own exercises" on public.exercises for update to authenticated using (created_by = auth.uid() and not is_system_exercise) with check (created_by = auth.uid() and not is_system_exercise);
create policy "delete own exercises" on public.exercises for delete to authenticated using (created_by = auth.uid() and not is_system_exercise);

-- PLANS
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.workout_plans(user_id);
grant select, insert, update, delete on public.workout_plans to authenticated;
grant all on public.workout_plans to service_role;
alter table public.workout_plans enable row level security;
create policy "own plans" on public.workout_plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger plans_updated before update on public.workout_plans for each row execute function public.set_updated_at();

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_order int not null default 0,
  target_sets int not null default 3 check (target_sets between 1 and 20),
  target_reps_min int check (target_reps_min >= 0),
  target_reps_max int check (target_reps_max >= 0),
  target_duration_seconds int check (target_duration_seconds >= 0),
  rest_seconds int not null default 90 check (rest_seconds between 0 and 900)
);
create index on public.workout_plan_exercises(workout_plan_id, exercise_order);
grant select, insert, update, delete on public.workout_plan_exercises to authenticated;
grant all on public.workout_plan_exercises to service_role;
alter table public.workout_plan_exercises enable row level security;
create policy "own plan exercises" on public.workout_plan_exercises for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.workout_plans p where p.id = workout_plan_id and p.user_id = auth.uid()));

create table public.workout_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  week_parity text not null default 'all' check (week_parity in ('all','odd','even')),
  effective_from date not null default current_date,
  effective_until date
);
create index on public.workout_schedule(user_id, day_of_week);
grant select, insert, update, delete on public.workout_schedule to authenticated;
grant all on public.workout_schedule to service_role;
alter table public.workout_schedule enable row level security;
create policy "own schedule" on public.workout_schedule for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.workout_plans p where p.id = workout_plan_id and p.user_id = auth.uid()));

-- SESSIONS
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  title text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index on public.workout_sessions(user_id, started_at desc);
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant all on public.workout_sessions to service_role;
alter table public.workout_sessions enable row level security;
create policy "own sessions" on public.workout_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_order int not null default 0,
  target_sets int not null default 3,
  target_reps_min int, target_reps_max int, target_duration_seconds int,
  rest_seconds int not null default 90,
  status text not null default 'pending' check (status in ('pending','completed','skipped'))
);
create index on public.workout_session_exercises(workout_session_id);
grant select, insert, update, delete on public.workout_session_exercises to authenticated;
grant all on public.workout_session_exercises to service_role;
alter table public.workout_session_exercises enable row level security;
create policy "own session exercises" on public.workout_session_exercises for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid()));

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  workout_session_exercise_id uuid not null references public.workout_session_exercises(id) on delete cascade,
  set_number int not null check (set_number >= 1),
  repetitions int check (repetitions >= 0),
  weight_kg numeric(6,2) check (weight_kg >= 0),
  weight_basis text not null default 'per_dumbbell' check (weight_basis in ('per_dumbbell','combined','bodyweight')),
  duration_seconds int check (duration_seconds >= 0),
  side text check (side in ('left','right','both')),
  completed_at timestamptz not null default now()
);
create index on public.workout_sets(workout_session_exercise_id);
create index on public.workout_sets(user_id, completed_at);
grant select, insert, update, delete on public.workout_sets to authenticated;
grant all on public.workout_sets to service_role;
alter table public.workout_sets enable row level security;
create policy "own sets" on public.workout_sets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.workout_session_exercises e where e.id = workout_session_exercise_id and e.user_id = auth.uid()));

-- FOODS
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  name text not null check (char_length(name) between 1 and 100),
  serving_description text,
  serving_size numeric(7,2) not null check (serving_size > 0),
  serving_unit text not null check (serving_unit in ('g','mL','serving','piece','cup','tbsp')),
  calories numeric(7,2) not null check (calories >= 0),
  protein_g numeric(6,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6,2) not null default 0 check (fat_g >= 0),
  source_note text,
  is_system_food boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.foods(lower(name));
grant select, insert, update, delete on public.foods to authenticated;
grant all on public.foods to service_role;
alter table public.foods enable row level security;
create policy "read system or own foods" on public.foods for select to authenticated using (is_system_food or created_by = auth.uid());
create policy "insert own foods" on public.foods for insert to authenticated with check (created_by = auth.uid() and not is_system_food);
create policy "update own foods" on public.foods for update to authenticated using (created_by = auth.uid() and not is_system_food) with check (created_by = auth.uid() and not is_system_food);
create policy "delete own foods" on public.foods for delete to authenticated using (created_by = auth.uid() and not is_system_food);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  food_id uuid references public.foods(id) on delete set null,
  food_name_snapshot text not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  consumed_at timestamptz not null default now(),
  log_date date not null,
  quantity numeric(7,2) not null check (quantity > 0),
  unit text not null,
  serving_multiplier numeric(8,4) not null check (serving_multiplier > 0),
  calories_snapshot numeric(7,1) not null check (calories_snapshot >= 0),
  protein_snapshot_g numeric(6,1) not null check (protein_snapshot_g >= 0),
  carbs_snapshot_g numeric(6,1) not null check (carbs_snapshot_g >= 0),
  fat_snapshot_g numeric(6,1) not null check (fat_snapshot_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.food_logs(user_id, log_date);
grant select, insert, update, delete on public.food_logs to authenticated;
grant all on public.food_logs to service_role;
alter table public.food_logs enable row level security;
create policy "own food logs" on public.food_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger food_logs_updated before update on public.food_logs for each row execute function public.set_updated_at();

-- SEED EXERCISES
insert into public.exercises (name, description, primary_muscle_group, equipment, instructions, tracking_type, is_unilateral, suggested_sets, suggested_reps, is_system_exercise) values
('Goblet Squat','Squat holding one dumbbell at the chest.','Quadriceps','Dumbbells','Hold a dumbbell vertically at your chest. Sit hips back and down, keep chest tall, then drive through heels to stand.','reps',false,3,'10–12',true),
('Dumbbell Floor Press','Chest press lying on the floor.','Chest','Dumbbells','Lie on the floor, knees bent. Press dumbbells up from elbows-on-floor until arms are straight, lower with control.','reps',false,3,'8–12',true),
('One-Arm Dumbbell Row','Single-arm row supported on a bench or chair.','Back','Dumbbells','Brace one hand on a support, back flat. Pull the dumbbell toward your hip, squeeze, lower slowly.','reps',true,3,'10–12 per arm',true),
('Dumbbell Biceps Curl','Standing curl for the biceps.','Biceps','Dumbbells','Stand tall, elbows by sides. Curl dumbbells up without swinging, lower slowly.','reps',false,2,'10–15',true),
('Dumbbell Romanian Deadlift','Hip hinge for hamstrings and glutes.','Hamstrings','Dumbbells','Hold dumbbells in front of thighs. Push hips back with soft knees, lower to mid-shin, then squeeze glutes to stand.','reps',false,3,'10–12',true),
('Dumbbell Shoulder Press','Overhead press for the shoulders.','Shoulders','Dumbbells','Start dumbbells at shoulder height. Press overhead until arms are straight, lower with control.','reps',false,3,'8–12',true),
('Dumbbell Reverse Lunge','Step-back lunge holding dumbbells.','Quadriceps','Dumbbells','Step one foot back and lower until both knees are near 90°. Drive through the front heel to return.','reps',true,3,'8–10 per leg',true),
('Forearm Plank','Isometric core hold on forearms.','Core','Bodyweight','Forearms under shoulders, body in a straight line from head to heels. Brace abs and hold.','time',false,3,'20–40 sec',true),
('Push-Up','Bodyweight press for chest and triceps.','Chest','Bodyweight','Hands under shoulders, body straight. Lower chest toward the floor, push back up.','reps',false,3,'8–15',true),
('Dumbbell Lateral Raise','Side raise for the shoulders.','Shoulders','Dumbbells','Raise dumbbells out to the sides to shoulder height with slight elbow bend, lower slowly.','reps',false,3,'12–15',true),
('Dumbbell Triceps Extension','Overhead extension for the triceps.','Triceps','Dumbbells','Hold one dumbbell overhead with both hands. Lower behind head by bending elbows, extend back up.','reps',false,3,'10–12',true),
('Dumbbell Calf Raise','Standing calf raise holding dumbbells.','Calves','Dumbbells','Stand holding dumbbells, rise onto toes, pause, lower heels slowly.','reps',false,3,'12–20',true);

-- SEED FOODS (approximate reference values)
insert into public.foods (name, serving_description, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source_note, is_system_food) values
('Cooked White Rice','1 cup cooked ≈ 158 g',100,'g',130,2.7,28.2,0.3,'Approx. USDA reference',true),
('Egg (whole, large)','1 large egg ≈ 50 g',1,'piece',72,6.3,0.4,4.8,'Approx. USDA reference',true),
('Chicken Breast (cooked, skinless)','Per 100 g cooked',100,'g',165,31,0,3.6,'Approx. USDA reference',true),
('Chicken Adobo','Per 100 g; varies by recipe',100,'g',190,18,3,11,'Approximate — recipes vary widely',true),
('Canned Sardines in Tomato Sauce','Per 100 g drained',100,'g',185,20,2,11,'Approx.; check product label',true),
('Tofu (firm)','Per 100 g',100,'g',144,15.7,3.5,8.7,'Approx. USDA reference',true),
('Monggo (cooked mung beans)','Per 100 g cooked, plain',100,'g',105,7,19,0.4,'Approx. USDA; ginisang monggo adds oil',true),
('Banana (lakatan, medium)','1 medium ≈ 118 g',1,'piece',105,1.3,27,0.4,'Approx. USDA reference',true),
('Milk (whole)','Per 250 mL',250,'mL',155,8,12,8,'Approx.; check product label',true),
('Peanut Butter','1 tbsp ≈ 16 g',1,'tbsp',95,3.6,3.5,8.1,'Approx. USDA reference',true),
('Bread (white pandesal / loaf)','1 slice or pandesal ≈ 28 g',1,'piece',75,2.5,14,1,'Approx.; varies by bakery',true),
('Peanuts (roasted)','Per 30 g',30,'g',170,7.5,5,14.5,'Approx. USDA reference',true),
('Tilapia (cooked)','Per 100 g cooked',100,'g',128,26,0,2.7,'Approx. USDA reference',true),
('Tuna (canned in water)','Per 100 g drained',100,'g',116,26,0,1,'Approx.; check product label',true),
('Oatmeal (rolled oats, dry)','Per 40 g dry',40,'g',150,5,27,2.5,'Approx. USDA reference',true),
('Sweet Potato / Kamote (boiled)','Per 100 g',100,'g',86,1.6,20,0.1,'Approx. USDA reference',true),
('Mixed Vegetables (boiled)','Per 100 g',100,'g',65,3,13,0.3,'Approximate — mix varies',true);

-- NEW USER HANDLER: profile, settings, default A/B plans and schedule
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare a_id uuid; b_id uuid;
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_settings (user_id) values (new.id);
  insert into public.workout_plans (user_id, name, description) values (new.id, 'Workout A', 'Full body: squat, press, row, curl') returning id into a_id;
  insert into public.workout_plans (user_id, name, description) values (new.id, 'Workout B', 'Full body: hinge, press, lunge, core') returning id into b_id;
  insert into public.workout_plan_exercises (user_id, workout_plan_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_duration_seconds, rest_seconds)
  select new.id, a_id, e.id, v.ord, v.sets, v.rmin, v.rmax, null, 90 from (values ('Goblet Squat',0,3,10,12),('Dumbbell Floor Press',1,3,8,12),('One-Arm Dumbbell Row',2,3,10,12),('Dumbbell Biceps Curl',3,2,10,15)) v(n,ord,sets,rmin,rmax) join public.exercises e on e.name = v.n and e.is_system_exercise;
  insert into public.workout_plan_exercises (user_id, workout_plan_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_duration_seconds, rest_seconds)
  select new.id, b_id, e.id, v.ord, v.sets, v.rmin, v.rmax, v.dur, 90 from (values ('Dumbbell Romanian Deadlift',0,3,10,12,null::int),('Dumbbell Shoulder Press',1,3,8,12,null),('Dumbbell Reverse Lunge',2,3,8,10,null),('Forearm Plank',3,3,null,null,40)) v(n,ord,sets,rmin,rmax,dur) join public.exercises e on e.name = v.n and e.is_system_exercise;
  -- Alternating: odd ISO weeks A/B/A, even weeks B/A/B
  insert into public.workout_schedule (user_id, workout_plan_id, day_of_week, week_parity) values
    (new.id, a_id, 1, 'odd'), (new.id, b_id, 3, 'odd'), (new.id, a_id, 5, 'odd'),
    (new.id, b_id, 1, 'even'), (new.id, a_id, 3, 'even'), (new.id, b_id, 5, 'even');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();


-- ==========================================
-- 2. WORKFLOWS & RPC FUNCTIONS (complete_onboarding, start_workout, etc.)
-- ==========================================
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


-- ==========================================
-- 3. ACCOUNT DELETION & MAINTENANCE
-- ==========================================
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



-- ==========================================
-- 4. BACKFILL EXISTING USERS
-- ==========================================
-- Ensure any user who signed up before trigger creation gets profiles, settings, and starter plans
do $$
declare
  r record;
  a_id uuid;
  b_id uuid;
begin
  for r in select id, coalesce(raw_user_meta_data->>'full_name', '') as name from auth.users loop
    insert into public.profiles (id, full_name) values (r.id, r.name) on conflict (id) do nothing;
    insert into public.user_settings (user_id) values (r.id) on conflict (user_id) do nothing;
    if not exists (select 1 from public.workout_plans where user_id = r.id) then
      insert into public.workout_plans (user_id, name, description) values (r.id, 'Workout A', 'Full body: squat, press, row, curl') returning id into a_id;
      insert into public.workout_plans (user_id, name, description) values (r.id, 'Workout B', 'Full body: hinge, press, lunge, core') returning id into b_id;
      insert into public.workout_plan_exercises (user_id, workout_plan_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_duration_seconds, rest_seconds)
      select r.id, a_id, e.id, v.ord, v.sets, v.rmin, v.rmax, null, 90 from (values ('Goblet Squat',0,3,10,12),('Dumbbell Floor Press',1,3,8,12),('One-Arm Dumbbell Row',2,3,10,12),('Dumbbell Biceps Curl',3,2,10,15)) v(n,ord,sets,rmin,rmax) join public.exercises e on e.name = v.n and e.is_system_exercise;
      insert into public.workout_plan_exercises (user_id, workout_plan_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_duration_seconds, rest_seconds)
      select r.id, b_id, e.id, v.ord, v.sets, v.rmin, v.rmax, v.dur, 90 from (values ('Dumbbell Romanian Deadlift',0,3,10,12,null::int),('Dumbbell Shoulder Press',1,3,8,12,null),('Dumbbell Reverse Lunge',2,3,8,10,null),('Forearm Plank',3,3,null,null,40)) v(n,ord,sets,rmin,rmax,dur) join public.exercises e on e.name = v.n and e.is_system_exercise;
      insert into public.workout_schedule (user_id, workout_plan_id, day_of_week, week_parity) values
        (r.id, a_id, 1, 'odd'), (r.id, b_id, 3, 'odd'), (r.id, a_id, 5, 'odd'),
        (r.id, b_id, 1, 'even'), (r.id, a_id, 3, 'even'), (r.id, b_id, 5, 'even')
      on conflict do nothing;
    end if;
  end loop;
end; $$;

-- Onboarding preference and schedule consistency
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

-- Apply after 0003. Public avatar images are user-selected; fitness records remain private.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.profiles add constraint profiles_social_links_object check (jsonb_typeof(social_links)='object');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Avatar public read" on storage.objects for select using (bucket_id='avatars');
create policy "Avatar owner insert" on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Avatar owner update" on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Avatar owner delete" on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
NOTIFY pgrst, 'reload schema';
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
-- Private scan drafts and conservative project-wide quota reservations.
alter table public.foods add column image_path text;
alter table public.food_logs add column image_path text;
alter table public.food_logs add column nutrition_source text;
create table public.meal_scans (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), state text not null default 'processing' check(state in('processing','ready','saved','failed','expired')),
 result jsonb, log_ids uuid[], reserved_tokens int not null default 10240
);
create index meal_scans_date on public.meal_scans(created_at);
create index meal_scans_owner on public.meal_scans(user_id,created_at);
alter table public.meal_scans enable row level security;
grant select,insert,update,delete on public.meal_scans to service_role;
create table public.meal_scan_gate(id int primary key check(id=1),blocked_until timestamptz);
insert into public.meal_scan_gate(id) values(1);
alter table public.meal_scan_gate enable row level security;
grant select,update on public.meal_scan_gate to service_role;
create or replace function public.reserve_meal_scan(p_user uuid,p_request uuid,p_daily int,p_personal int,p_rpm int,p_tpm int,p_preview boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare start_day timestamptz; reset_at timestamptz; block_at timestamptz; total int; personal int; minute_count int; tokens bigint; existing public.meal_scans;
begin
 if p_daily not between 1 and 1000 or p_personal not between 1 and 100 or p_rpm not between 1 and 60 or p_tpm not between 10240 and 1000000 then raise exception 'Invalid scan allowance'; end if;
 perform pg_advisory_xact_lock(730726001);
 start_day := date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
 reset_at := (date_trunc('day',now() at time zone 'America/Los_Angeles')+interval '1 day') at time zone 'America/Los_Angeles';
 select * into existing from meal_scans where id=p_request;
 if found then
   if existing.user_id<>p_user then raise exception 'Invalid scan request'; end if;
   return jsonb_build_object('allowed',true,'existing',true,'state',existing.state,'result',existing.result,'scan_id',existing.id);
 end if;
 select blocked_until into block_at from meal_scan_gate where id=1;
 select count(*),count(*) filter(where user_id=p_user) into total,personal from meal_scans where created_at>=start_day;
 select count(*),coalesce(sum(reserved_tokens),0) into minute_count,tokens from meal_scans where created_at>now()-interval '1 minute';
 if block_at>now() or total>=p_daily or personal>=p_personal then return jsonb_build_object('allowed',false,'retry_at',greatest(reset_at,block_at),'remaining',0); end if;
 if minute_count>=p_rpm or tokens+10240>p_tpm then return jsonb_build_object('allowed',false,'retry_at',now()+interval '1 minute','remaining',greatest(0,least(p_daily-total,p_personal-personal))); end if;
 if p_preview then return jsonb_build_object('allowed',true,'remaining',least(p_daily-total,p_personal-personal)); end if;
 -- Expire draft content; retain only reservation metadata for accurate accounting.
 update meal_scans set result=null,state='expired' where state in('ready','processing') and created_at<now()-interval '24 hours';
 insert into meal_scans(id,user_id) values(p_request,p_user);
 return jsonb_build_object('allowed',true,'scan_id',p_request,'remaining',least(p_daily-total,p_personal-personal)-1);
end; $$;
revoke all on function public.reserve_meal_scan(uuid,uuid,int,int,int,int,boolean) from public,anon,authenticated;
grant execute on function public.reserve_meal_scan(uuid,uuid,int,int,int,int,boolean) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('meal-photos','meal-photos',false,524288,array['image/jpeg']);
create policy "Read own meal photos" on storage.objects for select to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Upload own meal photos" on storage.objects for insert to authenticated with check(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
-- Users can remove uncommitted uploads, but saved diary/library pictures remain intact.
create policy "Remove unsaved meal photos" on storage.objects for delete to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.foods f where f.image_path=name) and not exists(select 1 from public.food_logs l where l.image_path=name));

create or replace function public.save_scanned_meal(p_scan uuid,p_items jsonb,p_meal text,p_date date,p_image text) returns uuid[]
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); draft public.meal_scans; item jsonb; food public.foods; fid uuid; qty numeric; kcal numeric; protein numeric; carbs numeric; fat numeric; new_id uuid; ids uuid[]:='{}'; label text; units text;
begin
 if u is null then raise exception 'Authentication required'; end if;
 select * into draft from meal_scans where id=p_scan and user_id=u for update;
 if not found then raise exception 'Scan not found'; end if;
 if draft.state='saved' then return draft.log_ids; end if;
 if draft.state<>'ready' or draft.created_at<now()-interval '24 hours' then raise exception 'Scan expired. Please scan your meal again.'; end if;
 if p_meal not in('breakfast','lunch','dinner','snack') or p_meal is null or p_date is null or p_date>current_date+1 then raise exception 'Invalid meal or date'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 8 then raise exception 'Choose between one and eight foods'; end if;
 if p_image is null or p_image<>u::text||'/'||p_scan::text||'.jpg' or not exists(select 1 from storage.objects where bucket_id='meal-photos' and name=p_image) then raise exception 'Upload your meal photo before saving'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,7307));
 for item in select value from jsonb_array_elements(p_items) loop
  label:=trim(item->>'name'); units:=item->>'unit'; qty:=(item->>'quantity')::numeric;
  if label is null or length(label) not between 1 and 100 or units is null or units not in('g','mL','serving','piece','cup','tbsp') or qty is null or qty not between 0.01 and 10000 then raise exception 'Invalid food portion'; end if;
  fid:=nullif(item->>'food_id','')::uuid;
  if fid is not null then
    select * into food from foods where id=fid and (is_system_food or created_by=u);
    if not found or food.serving_unit<>units then raise exception 'Food match is no longer available. Review the food again.'; end if;
  else
    -- Exact-name reuse prevents duplicate personal foods on subsequent scans.
    select * into food from foods where (is_system_food or created_by=u) and lower(trim(name))=lower(label) and serving_unit=units order by is_system_food desc,created_at limit 1;
    if not found then
      kcal:=(item->>'calories')::numeric; protein:=(item->>'protein')::numeric; carbs:=(item->>'carbs')::numeric; fat:=(item->>'fat')::numeric;
      if kcal is null or kcal not between 0 and 10000 or protein is null or protein not between 0 and 999 or carbs is null or carbs not between 0 and 999 or fat is null or fat not between 0 and 999 then raise exception 'Invalid estimated nutrition'; end if;
      insert into foods(created_by,name,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g,source_note,is_system_food,image_path)
      values(u,label,qty,units,kcal,protein,carbs,fat,'AI-estimated meal photo; reviewed by user',false,p_image) returning * into food;
    end if;
  end if;
  insert into food_logs(user_id,food_id,food_name_snapshot,meal_type,log_date,quantity,unit,serving_multiplier,calories_snapshot,protein_snapshot_g,carbs_snapshot_g,fat_snapshot_g,image_path,nutrition_source)
  values(u,food.id,food.name,p_meal,p_date,qty,units,qty/food.serving_size,food.calories*qty/food.serving_size,food.protein_g*qty/food.serving_size,food.carbs_g*qty/food.serving_size,food.fat_g*qty/food.serving_size,p_image,case when food.source_note like 'AI-estimated%' then 'ai_estimate' else 'library_match' end) returning id into new_id;
  ids:=array_append(ids,new_id);
 end loop;
 update meal_scans set state='saved',log_ids=ids,result=null where id=p_scan;
 return ids;
end; $$;
revoke all on function public.save_scanned_meal(uuid,jsonb,text,date,text) from public,anon;
grant execute on function public.save_scanned_meal(uuid,jsonb,text,date,text) to authenticated;
NOTIFY pgrst,'reload schema';

-- Called opportunistically by the server; never remove a committed food/diary image.
create or replace function public.unused_meal_photos(p_user uuid) returns text[]
language sql security definer set search_path=public as $$
 select coalesce(array_agg(name),'{}'::text[]) from (
   select o.name from storage.objects o where o.bucket_id='meal-photos'
   and (storage.foldername(o.name))[1]=p_user::text and o.created_at<now()-interval '24 hours'
   and not exists(select 1 from foods f where f.image_path=o.name)
   and not exists(select 1 from food_logs l where l.image_path=o.name)
   limit 100
 ) orphaned;
$$;
revoke all on function public.unused_meal_photos(uuid) from public,anon,authenticated;
grant execute on function public.unused_meal_photos(uuid) to service_role;

