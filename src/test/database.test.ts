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
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
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
