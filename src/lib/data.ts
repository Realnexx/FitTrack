import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Profile = T["profiles"]["Row"];
export type Goal = T["fitness_goals"]["Row"];
export type WeightLog = T["weight_logs"]["Row"];
export type Exercise = T["exercises"]["Row"];
export type Plan = T["workout_plans"]["Row"];
export type PlanExercise = T["workout_plan_exercises"]["Row"] & { exercise: Exercise };
export type Schedule = T["workout_schedule"]["Row"];
export type Session = T["workout_sessions"]["Row"];
export type SessionExercise = T["workout_session_exercises"]["Row"] & {
  exercise: Exercise;
  sets: WorkoutSet[];
};
export type WorkoutSet = T["workout_sets"]["Row"];
export type Food = T["foods"]["Row"];
export type FoodLog = T["food_logs"]["Row"];
export type Settings = T["user_settings"]["Row"];

export function unwrap<D>(r: { data: D; error: { message: string } | null }): D {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** Read all pages instead of silently truncating histories at the API row limit. */
async function readAll<R>(
  page: (offset: number) => PromiseLike<{ data: R[] | null; error: { message: string } | null }>,
): Promise<R[]> {
  const rows: R[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = unwrap(await page(offset)) ?? [];
    rows.push(...result);
    if (result.length < 1000) return rows;
  }
}

export async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user.id;
}

export const qk = {
  profile: ["profile"] as const,
  settings: ["settings"] as const,
  goal: ["goal"] as const,
  weights: (from?: string) => ["weights", from ?? "all"] as const,
  plans: ["plans"] as const,
  plan: (id: string) => ["plan", id] as const,
  schedule: ["schedule"] as const,
  exercises: ["exercises"] as const,
  sessions: (from?: string) => ["sessions", from ?? "recent"] as const,
  session: (id: string) => ["session", id] as const,
  activeSession: ["activeSession"] as const,
  foods: (q: string) => ["foods", q] as const,
  foodLogs: (from: string, to: string) => ["foodLogs", from, to] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", await uid())
          .maybeSingle(),
      ),
  });
}
export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: async () => unwrap(await supabase.from("user_settings").select("*").maybeSingle()),
  });
}
export function useGoal() {
  return useQuery({
    queryKey: qk.goal,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("fitness_goals")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
  });
}
/** Weight logs ascending; `from` limits to recent records. */
export function useWeights(from?: string) {
  return useQuery({
    queryKey: qk.weights(from),
    queryFn: async () => {
      let q = supabase.from("weight_logs").select("*").order("measured_at", { ascending: true });
      if (from) q = q.gte("measured_at", from);
      return readAll((offset) => q.range(offset, offset + 999));
    },
  });
}
export function useLatestWeight() {
  return useQuery({
    queryKey: ["weights", "latest"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("weight_logs")
          .select("*")
          .order("measured_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
  });
}
export function usePlans() {
  return useQuery({
    queryKey: qk.plans,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("workout_plans")
          .select("*, workout_plan_exercises(id)")
          .order("created_at"),
      ),
  });
}
export function usePlan(id: string) {
  return useQuery({
    queryKey: qk.plan(id),
    queryFn: async () => {
      const plan = unwrap(
        await supabase.from("workout_plans").select("*").eq("id", id).maybeSingle(),
      );
      if (!plan) return null;
      const items = unwrap(
        await supabase
          .from("workout_plan_exercises")
          .select("*, exercise:exercises(*)")
          .eq("workout_plan_id", id)
          .order("exercise_order"),
      ) as unknown as PlanExercise[];
      return { plan, items };
    },
  });
}
export function useSchedule() {
  return useQuery({
    queryKey: qk.schedule,
    queryFn: async () => unwrap(await supabase.from("workout_schedule").select("*")),
  });
}
export function useExercises() {
  return useQuery({
    queryKey: qk.exercises,
    staleTime: 10 * 60_000,
    queryFn: async () => unwrap(await supabase.from("exercises").select("*").order("name")),
  });
}
export function useSessions(from?: string) {
  return useQuery({
    queryKey: qk.sessions(from),
    queryFn: async () => {
      let q = supabase
        .from("workout_sessions")
        .select(
          "*, workout_session_exercises(id, status, exercise_id, exercise:exercises(id, name, tracking_type), workout_sets(repetitions, weight_kg, weight_basis, duration_seconds))",
        )
        .eq("status", "completed")
        .order("started_at", { ascending: false });
      if (from) q = q.gte("started_at", from);
      else q = q.limit(50);
      return from ? readAll((offset) => q.range(offset, offset + 999)) : unwrap(await q);
    },
  });
}
export function useActiveSession() {
  return useQuery({
    queryKey: qk.activeSession,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("workout_sessions")
          .select("*")
          .eq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
  });
}
export function useSession(id: string) {
  return useQuery({
    queryKey: qk.session(id),
    queryFn: async () => {
      const session = unwrap(
        await supabase.from("workout_sessions").select("*").eq("id", id).maybeSingle(),
      );
      if (!session) return null;
      const exercises = unwrap(
        await supabase
          .from("workout_session_exercises")
          .select("*, exercise:exercises(*), sets:workout_sets(*)")
          .eq("workout_session_id", id)
          .order("exercise_order"),
      ) as unknown as SessionExercise[];
      exercises.forEach((e) => e.sets.sort((a, b) => a.set_number - b.set_number));
      return { session, exercises };
    },
  });
}
export function useFoods(search: string) {
  return useQuery({
    queryKey: qk.foods(search),
    queryFn: async () => {
      let q = supabase
        .from("foods")
        .select("*")
        .order("is_system_food", { ascending: true })
        .order("name")
        .limit(60);
      if (search.trim()) q = q.ilike("name", `%${search.trim().replace(/[%_]/g, "")}%`);
      return unwrap(await q);
    },
  });
}
export function useFoodLogs(from: string, to: string) {
  return useQuery({
    queryKey: qk.foodLogs(from, to),
    queryFn: async () =>
      readAll((offset) =>
        supabase
          .from("food_logs")
          .select("*")
          .gte("log_date", from)
          .lte("log_date", to)
          .order("consumed_at")
          .order("id")
          .range(offset, offset + 999),
      ),
  });
}

/** Mutation wrapper with toast feedback and cache invalidation. */
export function useAction<V, R = unknown>(
  fn: (v: V) => Promise<R>,
  opts: { invalidate: (readonly unknown[])[]; success?: string; onSuccess?: (r: R) => void },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      opts.invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      if (opts.success) toast.success(opts.success);
      opts.onSuccess?.(r);
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });
}

export function friendlyError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError/i.test(m))
    return "Network problem — check your connection and try again.";
  if (/JWT|session/i.test(m)) return "Your session has expired. Please sign in again.";
  if (/violates check constraint/i.test(m)) return "One of the values is out of the allowed range.";
  return m;
}
