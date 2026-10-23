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
