// Pure business calculations. Kept free of React/DB so they can be unit tested.

export const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
export const round0 = (n: number) => Math.round(n);

export type GoalStatus = "not_started" | "progressing" | "reached";

export interface GoalProgress {
  change: number; // latest - start
  remaining: number; // target - latest
  percent: number; // 0..100, clamped
  status: GoalStatus;
}

/** Goal Progress = (Latest − Start) / (Target − Start) × 100, safe for loss goals and zero denominators. */
export function goalProgress(start: number, latest: number | null, target: number): GoalProgress {
  const current = latest ?? start;
  const change = round1(current - start);
  const remaining = round1(target - current);
  const denom = target - start;
  let percent: number;
  if (Math.abs(denom) < 1e-9) {
    percent = 100; // maintain goal: target equals start
  } else {
    percent = ((current - start) / denom) * 100;
  }
  percent = Math.max(0, Math.min(100, round1(percent)));
  let status: GoalStatus = "progressing";
  if (percent >= 100) status = "reached";
  else if (percent <= 0) status = "not_started";
  return { change, remaining, percent, status };
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Scale a food's per-serving macros by quantity in the food's unit. */
export function scaleNutrition(
  food: Macros & { serving_size: number },
  quantity: number,
): Macros & { multiplier: number } {
  if (!(quantity > 0) || !(food.serving_size > 0)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, multiplier: 0 };
  }
  const m = quantity / food.serving_size;
  return {
    multiplier: Math.round(m * 10000) / 10000,
    calories: round1(food.calories * m),
    protein: round1(food.protein * m),
    carbs: round1(food.carbs * m),
    fat: round1(food.fat * m),
  };
}

export function sumMacros(rows: Macros[]): Macros {
  const t = rows.reduce(
    (a, r) => ({
      calories: a.calories + r.calories,
      protein: a.protein + r.protein,
      carbs: a.carbs + r.carbs,
      fat: a.fat + r.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: round0(t.calories),
    protein: round1(t.protein),
    carbs: round1(t.carbs),
    fat: round1(t.fat),
  };
}

/** Volume = Σ reps × load. Timed sets (no reps) and unloaded sets are excluded. */
export function trainingVolume(
  sets: { repetitions: number | null; weight_kg: number | null; weight_basis?: string }[],
): number {
  return round1(
    sets.reduce((v, s) => {
      if (s.repetitions == null || s.weight_kg == null || s.weight_kg <= 0) return v;
      const load = s.weight_basis === "per_dumbbell" ? s.weight_kg * 2 : s.weight_kg;
      return v + s.repetitions * load;
    }, 0),
  );
}

export type Sex = "male" | "female" | "other" | null;
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
const ACTIVITY: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Mifflin–St Jeor estimate. An estimate only — not a medical prescription. */
export function suggestTargets(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: Activity;
  goal: string;
  weeklyChangeKg: number;
}) {
  const sexAdj = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexAdj;
  const tdee = bmr * ACTIVITY[p.activity];
  // ~7700 kcal per kg of body-weight change, spread across 7 days
  const adj = (p.weeklyChangeKg * 7700) / 7;
  const calories = Math.round((tdee + adj) / 50) * 50;
  const proteinPerKg = p.goal === "gain_weight" || p.goal === "build_muscle" ? 1.8 : 1.6;
  const protein = Math.round(p.weightKg * proteinPerKg);
  return { calories: Math.max(1200, calories), protein, tdee: Math.round(tdee) };
}

/** ISO week number, used for alternating A/B schedules. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export interface ScheduleRow {
  workout_plan_id: string;
  day_of_week: number;
  week_parity: "all" | "odd" | "even" | string;
  effective_from?: string;
  effective_until?: string | null;
}

export function scheduledPlanFor(date: Date, rows: ScheduleRow[]): string | null {
  const dow = date.getDay();
  const parity = isoWeek(date) % 2 === 1 ? "odd" : "even";
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const hit = rows.find(
    (r) =>
      r.day_of_week === dow &&
      (r.week_parity === "all" || r.week_parity === parity) &&
      (!r.effective_from || r.effective_from <= dateKey) &&
      (!r.effective_until || r.effective_until >= dateKey),
  );
  return hit?.workout_plan_id ?? null;
}

export function ageFromDob(dob: string | null, now = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (!Number.isFinite(d.getTime()) || d > now || d.toISOString().slice(0, 10) !== dob) return null;
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

/** Average weekly change from first to last entry (sorted ascending). */
export function avgWeeklyChange(
  entries: { weight_kg: number; measured_at: string }[],
): number | null {
  if (entries.length < 2) return null;
  const a = entries[0];
  const b = entries[entries.length - 1];
  if (!a || !b) return null;
  const days = (new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()) / 86400000;
  if (days < 1) return null;
  return Math.round(((b.weight_kg - a.weight_kg) / days) * 7 * 100) / 100;
}
