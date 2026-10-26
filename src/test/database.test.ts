// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
async function asUser<T>(
  id: string,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    return fn(tx);
  });
}
const payload = {
  full_name: "Test User",
  date_of_birth: "2000-01-01",
  height_cm: 163,
  sex: null,
  activity_level: "moderate",
  experience_level: "beginner",
  workout_location: "Home",
  equipment: ["Dumbbells"],
  preferred_days: [1, 3, 5],
  goal_type: "build_muscle",
  starting_weight_kg: 48,
  target_weight_kg: 55,
  weekly_weight_change_target_kg: 0.25,
  daily_calorie_target: 2100,
  daily_protein_target_g: 95,
  start_date: "2026-10-23",
};
beforeAll(async () => {
  await db.exec(
    `create role authenticated; create role service_role; create role anon; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant all on storage.objects to authenticated;
    grant select on storage.objects to anon;`);
  for (const file of [
    "0000_migration.sql",
    "0001_mvp_workflows.sql",
    "0002_account_requests.sql",
    "0003_onboarding_preferences.sql",
    "0004_profile_connections.sql",
    "0005_bmi_history.sql",
    "0006_workout_set_limits.sql",
    "0007_meal_scanner.sql",
  ])
    await db.exec(
      readFileSync(new URL("../../drizzle/migrations/" + file, import.meta.url), "utf8"),
    );
  await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
}, 30000);
afterAll(async () => {
  await db.close();
});
describe("Database MVP workflows and row level security", () => {
  it("seeds reference data without fabricated consumption or weight history", async () => {
    const counts = await asUser(alice, async (tx) => ({
      exercises: (await tx.query("select * from exercises")).rows.length,
      foods: (await tx.query("select * from foods")).rows.length,
      plans: (await tx.query("select * from workout_plans")).rows.length,
      weights: (await tx.query("select * from weight_logs")).rows.length,
      logs: (await tx.query("select * from food_logs")).rows.length,
    }));
    expect(counts).toEqual({ exercises: 12, foods: 17, plans: 2, weights: 0, logs: 0 });
  });
  it("completes onboarding atomically and can safely retry", async () => {
    await asUser(alice, (tx) =>
      tx.query("select complete_onboarding($1::jsonb)", [JSON.stringify(payload)]),
    );
    await asUser(alice, (tx) =>
      tx.query("select complete_onboarding($1::jsonb)", [JSON.stringify(payload)]),
    );
    const result = await asUser(alice, async (tx) => ({
      profile: (
        await tx.query<{ onboarding_completed: boolean }>(
          "select onboarding_completed from profiles",
        )
      ).rows[0],
      goals: (await tx.query("select * from fitness_goals")).rows.length,
    }));
    expect(result.profile?.onboarding_completed).toBe(true);
    expect(result.goals).toBe(1);
  });
  it("rolls back a bad onboarding payload", async () => {
    await expect(
      asUser(bob, (tx) =>
        tx.query("select complete_onboarding($1::jsonb)", [
          JSON.stringify({ ...payload, daily_calorie_target: 0 }),
        ]),
      ),
    ).rejects.toThrow();
    const r = await asUser(bob, (tx) => tx.query("select * from fitness_goals"));
    expect(r.rows).toHaveLength(0);
    const p = await asUser(bob, (tx) =>
      tx.query<{ onboarding_completed: boolean }>("select onboarding_completed from profiles"),
    );
    expect(p.rows[0]?.onboarding_completed).toBe(false);
  });
  it("denies reading or writing another account records", async () => {
    const p = await asUser(bob, (tx) => tx.query("select * from profiles where id=$1", [alice]));
    expect(p.rows).toHaveLength(0);
    await expect(
      asUser(bob, (tx) =>
        tx.query("insert into weight_logs(user_id,weight_kg) values($1,50)", [alice]),
      ),
    ).rejects.toThrow();
    const update = await asUser(bob, (tx) =>
      tx.query("update profiles set full_name=$1 where id=$2 returning id", ["Intruder", alice]),
    );
    expect(update.rows).toHaveLength(0);
  });
  it("creates and resumes one workout with copied exercise targets", async () => {
    const plan = await asUser(alice, (tx) =>
      tx.query<{ id: string }>("select id from workout_plans where name='Workout A'"),
    );
    const id = plan.rows[0]!.id;
    const first = await asUser(alice, (tx) =>
      tx.query<{ id: string }>("select start_workout($1) as id", [id]),
    );
    const second = await asUser(alice, (tx) =>
      tx.query<{ id: string }>("select start_workout($1) as id", [id]),
    );
    expect(first.rows[0]?.id).toBe(second.rows[0]?.id);
    const exercises = await asUser(alice, (tx) =>
      tx.query("select * from workout_session_exercises"),
    );
    expect(exercises.rows).toHaveLength(4);
  });
  it("blocks starting another account plan", async () => {
    const plan = await asUser(alice, (tx) =>
      tx.query<{ id: string }>("select id from workout_plans limit 1"),
    );
    await expect(
      asUser(bob, (tx) => tx.query("select start_workout($1)", [plan.rows[0]!.id])),
    ).rejects.toThrow("Plan not found");
  });
  it("rejects cross-account session parent references", async () => {
    const plan = await asUser(alice, (tx) =>
      tx.query<{ id: string }>("select id from workout_plans limit 1"),
    );
    await expect(
      asUser(bob, (tx) =>
        tx.query(
          "insert into workout_sessions(user_id,workout_plan_id,title) values($1,$2,'Bad')",
          [bob, plan.rows[0]!.id],
        ),
      ),
    ).rejects.toThrow();
  });
  it("replaces overlapping schedule rows and preserves opposite weeks", async () => {
    const plan = await asUser(alice, (tx) =>
      tx.query<{ id: string }>("select id from workout_plans where name='Workout A'"),
    );
    await asUser(alice, (tx) => tx.query("select set_workout_day($1,1,'all')", [plan.rows[0]!.id]));
    await asUser(alice, (tx) => tx.query("select set_workout_day($1,1,'odd')", [plan.rows[0]!.id]));
    const rows = await asUser(alice, (tx) =>
      tx.query<{ week_parity: string }>(
        "select week_parity from workout_schedule where day_of_week=1 order by week_parity",
      ),
    );
    expect(rows.rows.map((r) => r.week_parity)).toEqual(["even", "odd"]);
  });
  it("cannot modify starter foods or read another user custom food", async () => {
    const f = await asUser(alice, (tx) =>
      tx.query("update foods set calories=1 where is_system_food returning id"),
    );
    expect(f.rows).toHaveLength(0);
    await asUser(alice, (tx) =>
      tx.query(
        "insert into foods(created_by,name,serving_size,serving_unit,calories) values($1,'Private recipe',100,'g',150)",
        [alice],
      ),
    );
    const rows = await asUser(bob, (tx) =>
      tx.query("select * from foods where name='Private recipe'"),
    );
    expect(rows.rows).toHaveLength(0);
  });
  it("validates negative quantities and invalid weights at the database boundary", async () => {
    await expect(
      asUser(alice, (tx) =>
        tx.query("insert into weight_logs(user_id,weight_kg) values($1,-1)", [alice]),
      ),
    ).rejects.toThrow();
  });
  it("queues a deletion request and denies direct deletion by an authenticated user", async () => {
    await asUser(bob, (tx) =>
      tx.query("insert into account_deletion_requests(user_id) values($1)", [bob]),
    );
    const other = await asUser(alice, (tx) => tx.query("select * from account_deletion_requests"));
    expect(other.rows).toHaveLength(0);
    await expect(
      asUser(bob, (tx) => tx.query("select fulfill_account_deletion($1)", [bob])),
    ).rejects.toThrow();
  });
  it("a trusted operator can fulfill a pending request and remove all associated data", async () => {
    await db.query("select fulfill_account_deletion($1)", [bob]);
    const user = await db.query("select * from auth.users where id=$1", [bob]);
    expect(user.rows).toHaveLength(0);
    const settings = await db.query("select * from user_settings where user_id=$1", [bob]);
    expect(settings.rows).toHaveLength(0);
    const plans = await db.query("select * from workout_plans where user_id=$1", [bob]);
    expect(plans.rows).toHaveLength(0);
  });
});

it("persists every onboarding answer and schedules exactly the selected days atomically", async () => {
  const user = "33333333-3333-4333-8333-333333333333";
  await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)", [
    user,
    JSON.stringify({ full_name: "Registered Name" }),
  ]);
  const input = {
    ...payload,
    full_name: "Registered Name",
    height_cm: 171,
    workout_location: "Gym",
    activity_level: "active",
    experience_level: "intermediate",
    equipment: ["Bodyweight", "Resistance Bands"],
    preferred_days: [0, 2, 4, 5, 6],
    starting_weight_kg: 60,
    target_weight_kg: 65,
    weekly_weight_change_target_kg: 0.3,
    daily_calorie_target: 2300,
    daily_protein_target_g: 110,
  };
  await asUser(user, (tx) =>
    tx.query("select complete_onboarding($1::jsonb)", [JSON.stringify(input)]),
  );
  await asUser(user, (tx) =>
    tx.query("select complete_onboarding($1::jsonb)", [JSON.stringify(input)]),
  );
  const result = await asUser(user, async (tx) => ({
    profile: (await tx.query("select * from profiles")).rows[0],
    goals: (await tx.query("select * from fitness_goals")).rows,
    schedule: (
      await tx.query(
        "select s.day_of_week,s.week_parity,p.name from workout_schedule s join workout_plans p on p.id=s.workout_plan_id order by day_of_week,week_parity",
      )
    ).rows,
  }));
  expect(result.profile).toMatchObject({
    full_name: input.full_name,
    height_cm: "171.0",
    activity_level: "active",
    experience_level: "intermediate",
    workout_location: "Gym",
    equipment: input.equipment,
    preferred_days: input.preferred_days,
    onboarding_completed: true,
  });
  expect(result.goals).toHaveLength(1);
  expect(result.goals[0]).toMatchObject({
    starting_weight_kg: "60.00",
    target_weight_kg: "65.00",
    daily_calorie_target: 2300,
    daily_protein_target_g: 110,
  });
  expect(result.schedule).toHaveLength(10);
  for (const [position, day] of input.preferred_days.entries()) {
    expect(result.schedule).toContainEqual({
      day_of_week: day,
      week_parity: "odd",
      name: position % 2 === 0 ? "Workout A" : "Workout B",
    });
    expect(result.schedule).toContainEqual({
      day_of_week: day,
      week_parity: "even",
      name: position % 2 === 0 ? "Workout B" : "Workout A",
    });
  }
});

it("rejects invalid training days without changing profile, goal or starter schedule", async () => {
  const user = "44444444-4444-4444-8444-444444444444";
  await db.query("insert into auth.users(id) values($1)", [user]);
  await expect(
    asUser(user, (tx) =>
      tx.query("select complete_onboarding($1::jsonb)", [
        JSON.stringify({ ...payload, preferred_days: [7] }),
      ]),
    ),
  ).rejects.toThrow("Choose valid training days");
  const result = await asUser(user, async (tx) => ({
    profile: (await tx.query("select onboarding_completed from profiles")).rows[0],
    goals: (await tx.query("select * from fitness_goals")).rows,
    schedule: (await tx.query("select * from workout_schedule")).rows,
  }));
  expect(result.profile).toMatchObject({ onboarding_completed: false });
  expect(result.goals).toHaveLength(0);
  expect(result.schedule).toHaveLength(6);
});

describe("avatar storage security", () => {
  it("allows own uploads, rejects other folders, and prevents cross-account deletion", async () => {
    await asUser(alice, (tx) =>
      tx.query("insert into storage.objects(bucket_id,name) values ('avatars',$1)", [
        alice + "/photo.png",
      ]),
    );
    await expect(
      asUser(bob, (tx) =>
        tx.query("insert into storage.objects(bucket_id,name) values ('avatars',$1)", [
          alice + "/other.png",
        ]),
      ),
    ).rejects.toThrow();
    const deleted = await asUser(bob, (tx) =>
      tx.query("delete from storage.objects where name=$1 returning name", [alice + "/photo.png"]),
    );
    expect(deleted.rows).toHaveLength(0);
    const own = await asUser(alice, (tx) =>
      tx.query("delete from storage.objects where name=$1 returning name", [alice + "/photo.png"]),
    );
    expect(own.rows).toHaveLength(1);
  });
  it("saves photo and social links only on the owning profile", async () => {
    await asUser(alice, (tx) =>
      tx.query("update profiles set avatar_url=$1,social_links=$2 where id=$3", [
        "https://example.com/photo.png",
        JSON.stringify({ github: "https://github.com/person" }),
        alice,
      ]),
    );
    const denied = await asUser(bob, (tx) =>
      tx.query("update profiles set avatar_url=null where id=$1 returning id", [alice]),
    );
    expect(denied.rows).toHaveLength(0);
    const own = await asUser(alice, (tx) =>
      tx.query<{ avatar_url: string }>("select avatar_url from profiles where id=$1", [alice]),
    );
    expect(own.rows[0]?.avatar_url).toBe("https://example.com/photo.png");
  });
});

describe("private BMI history", () => {
  it("calculates snapshots in the database and isolates each account", async () => {
    await asUser(alice, (tx) =>
      tx.query("insert into bmi_logs(weight_kg,height_cm,adult_confirmed) values (70,175,true)"),
    );
    const own = await asUser(alice, (tx) =>
      tx.query<{ bmi: number; weight_kg: number; height_cm: number }>("select * from bmi_logs"),
    );
    expect(own.rows).toHaveLength(1);
    expect(own.rows[0]?.bmi).toBeCloseTo(22.857142);
    const other = await asUser(bob, (tx) => tx.query("select * from bmi_logs"));
    expect(other.rows).toHaveLength(0);
    await expect(
      asUser(bob, (tx) =>
        tx.query("insert into bmi_logs(user_id,weight_kg,height_cm) values ($1,70,175)", [alice]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(alice, (tx) => tx.query("insert into bmi_logs(weight_kg,height_cm) values (0,175)")),
    ).rejects.toThrow();
    await asUser(alice, (tx) => tx.query("update profiles set height_cm=180 where id=$1", [alice]));
    const original = await asUser(alice, (tx) =>
      tx.query<{ height_cm: number }>("select height_cm from bmi_logs"),
    );
    expect(original.rows[0]?.height_cm).toBe(175);
  });
});

it("keeps the saved schedule unchanged when an invalid or foreign plan is submitted", async () => {
  const plan = await asUser(alice, (tx) =>
    tx.query<{ id: string }>("select id from workout_plans limit 1"),
  );
  const before = await asUser(alice, (tx) =>
    tx.query("select * from workout_schedule order by id"),
  );
  await expect(
    asUser(alice, (tx) => tx.query("select set_workout_day($1,7,'all')", [plan.rows[0]!.id])),
  ).rejects.toThrow();
  await expect(
    asUser(bob, (tx) => tx.query("select set_workout_day($1,1,'all')", [plan.rows[0]!.id])),
  ).rejects.toThrow();
  const after = await asUser(alice, (tx) => tx.query("select * from workout_schedule order by id"));
  expect(after.rows).toEqual(before.rows);
});

it("caps workout sets, completes the exercise and preserves editing", async () => {
  const result = await asUser(alice, (tx) =>
    tx.query<{ id: string; target_sets: number }>(
      "select id,target_sets from workout_session_exercises where status='pending' limit 1",
    ),
  );
  const exercise = result.rows[0]!;
  for (let n = 1; n <= exercise.target_sets; n++)
    await asUser(alice, (tx) =>
      tx.query(
        "insert into workout_sets(workout_session_exercise_id,set_number,repetitions,weight_kg) values ($1,$2,10,5)",
        [exercise.id, n],
      ),
    );
  const completed = await asUser(alice, (tx) =>
    tx.query<{ status: string }>("select status from workout_session_exercises where id=$1", [
      exercise.id,
    ]),
  );
  expect(completed.rows[0]?.status).toBe("completed");
  await expect(
    asUser(alice, (tx) =>
      tx.query(
        "insert into workout_sets(workout_session_exercise_id,set_number,repetitions) values ($1,$2,10)",
        [exercise.id, exercise.target_sets + 1],
      ),
    ),
  ).rejects.toThrow("No more sets");
  await asUser(alice, (tx) =>
    tx.query(
      "update workout_sets set repetitions=12 where workout_session_exercise_id=$1 and set_number=1",
      [exercise.id],
    ),
  );
  await asUser(alice, (tx) =>
    tx.query("delete from workout_sets where workout_session_exercise_id=$1 and set_number=1", [
      exercise.id,
    ]),
  );
  const reopened = await asUser(alice, (tx) =>
    tx.query<{ status: string }>("select status from workout_session_exercises where id=$1", [
      exercise.id,
    ]),
  );
  expect(reopened.rows[0]?.status).toBe("pending");
});

describe("meal scanner quota and atomic saves", () => {
  const scanId = "77777777-7777-4777-8777-777777777777";
  const newId = "88888888-8888-4888-8888-888888888888";
  const photo = alice + "/" + scanId + ".jpg";
  const detected = [
    {
      food_id: null,
      name: "Test photographed dish",
      quantity: 150,
      unit: "g",
      calories: 240,
      protein: 15,
      carbs: 25,
      fat: 9,
      notes: "Estimate",
    },
  ];
  it("reserves quota atomically and denies direct client access to the quota function", async () => {
    await expect(
      asUser(alice, (tx) =>
        tx.query("select reserve_meal_scan($1,$2,1,1,2,20480,false)", [alice, scanId]),
      ),
    ).rejects.toThrow();
    const first = await db.query<{ result: { allowed: boolean } }>(
      "select reserve_meal_scan($1,$2,1,1,2,20480,false) result",
      [alice, scanId],
    );
    expect(first.rows[0]?.result.allowed).toBe(true);
    const duplicate = await db.query<{ result: { existing: boolean } }>(
      "select reserve_meal_scan($1,$2,1,1,2,20480,false) result",
      [alice, scanId],
    );
    expect(duplicate.rows[0]?.result.existing).toBe(true);
    const second = await db.query<{ result: { allowed: boolean } }>(
      "select reserve_meal_scan($1,$2,1,1,2,20480,false) result",
      [bob, newId],
    );
    expect(second.rows[0]?.result.allowed).toBe(false);
    expect((await db.query("select id from meal_scans")).rows).toHaveLength(1);
  });
  it("cannot read another user's scan drafts or private photo", async () => {
    await expect(asUser(bob, (tx) => tx.query("select * from meal_scans"))).rejects.toThrow(
      "permission denied",
    );
    await db.query("insert into storage.objects(bucket_id,name) values ('meal-photos',$1)", [
      photo,
    ]);
    expect(
      (await asUser(bob, (tx) => tx.query("select * from storage.objects where name=$1", [photo])))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(alice, (tx) =>
          tx.query("select * from storage.objects where name=$1", [photo]),
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("rolls back foods and diary entries when any selected item is invalid", async () => {
    await db.query("update meal_scans set state='ready',result=$1 where id=$2", [
      JSON.stringify({ items: detected }),
      scanId,
    ]);
    await expect(
      asUser(alice, (tx) =>
        tx.query("select save_scanned_meal($1,$2::jsonb,'lunch',current_date,$3)", [
          scanId,
          JSON.stringify([...detected, { ...detected[0], name: "Bad food", calories: -1 }]),
          photo,
        ]),
      ),
    ).rejects.toThrow();
    expect(
      (
        await asUser(alice, (tx) =>
          tx.query("select * from foods where name='Test photographed dish'"),
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      asUser(bob, (tx) =>
        tx.query("select save_scanned_meal($1,$2::jsonb,'lunch',current_date,$3)", [
          scanId,
          JSON.stringify(detected),
          photo,
        ]),
      ),
    ).rejects.toThrow("Scan not found");
  });
  it("saves personal food and meal together and returns the same entries on retry", async () => {
    const args = [scanId, JSON.stringify(detected), photo];
    const first = await asUser(alice, (tx) =>
      tx.query<{ ids: string[] }>(
        "select save_scanned_meal($1,$2::jsonb,'lunch',current_date,$3) ids",
        args,
      ),
    );
    const repeated = await asUser(alice, (tx) =>
      tx.query<{ ids: string[] }>(
        "select save_scanned_meal($1,$2::jsonb,'lunch',current_date,$3) ids",
        args,
      ),
    );
    expect(first.rows[0]?.ids).toEqual(repeated.rows[0]?.ids);
    const food = await asUser(alice, (tx) =>
      tx.query<{ image_path: string; created_by: string }>(
        "select * from foods where name='Test photographed dish'",
      ),
    );
    expect(food.rows).toHaveLength(1);
    expect(food.rows[0]?.image_path).toBe(photo);
    expect(food.rows[0]?.created_by).toBe(alice);
    const logs = await asUser(alice, (tx) =>
      tx.query<{ calories_snapshot: number; image_path: string }>(
        "select * from food_logs where image_path=$1",
        [photo],
      ),
    );
    expect(logs.rows).toHaveLength(1);
    expect(Number(logs.rows[0]?.calories_snapshot)).toBe(240);
    const deleted = await asUser(alice, (tx) =>
      tx.query("delete from storage.objects where name=$1 returning name", [photo]),
    );
    expect(deleted.rows).toHaveLength(0);
  });
});

it("enforces minute/token allowances and the shared provider circuit breaker", async () => {
  const request = "99999999-9999-4999-8999-999999999999";
  await db.exec("update meal_scans set created_at=now()");
  const minute = await db.query<{ result: { allowed: boolean } }>(
    "select reserve_meal_scan($1,$2,10,5,1,20480,true) result",
    [bob, request],
  );
  expect(minute.rows[0]?.result.allowed).toBe(false);
  const tokens = await db.query<{ result: { allowed: boolean } }>(
    "select reserve_meal_scan($1,$2,10,5,2,10240,true) result",
    [bob, request],
  );
  expect(tokens.rows[0]?.result.allowed).toBe(false);
  await db.exec("update meal_scan_gate set blocked_until=now()+interval '1 hour' where id=1");
  const blocked = await db.query<{ result: { allowed: boolean } }>(
    "select reserve_meal_scan($1,$2,10,5,60,1000000,true) result",
    [bob, request],
  );
  expect(blocked.rows[0]?.result.allowed).toBe(false);
  expect((await db.query("select id from meal_scans")).rows).toHaveLength(1);
  await db.exec("update meal_scan_gate set blocked_until=null where id=1");
});
