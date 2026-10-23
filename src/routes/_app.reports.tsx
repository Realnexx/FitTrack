import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useWeights, useSessions, useFoodLogs, useSettings, useGoal } from "@/lib/data";
import { todayISO, shiftISO } from "@/lib/dates";
import { trainingVolume, avgWeeklyChange, sumMacros, goalProgress } from "@/lib/calc";
import { weightToDisplay } from "@/lib/measurements";
import { useDisplayDate } from "@/hooks/use-display-date";
import {
  PageHeader,
  Panel,
  StatCard,
  LoadingBlock,
  ErrorBlock,
  RangeTabs,
} from "@/components/common";
import { WeightChart } from "@/components/weight-chart";
import { MetricChart } from "@/components/metric-chart";
import { Field, selectClass } from "@/components/fields";
import {
  BarChart3,
  TrendingUp,
  Dumbbell,
  Flame,
  Beef,
  ArrowUpRight,
  Activity,
  Info,
  Utensils,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/_app/reports")({ component: Reports });
export function Reports() {
  const [range, setRange] = useState("30");
  const [customFrom, setCustomFrom] = useState(shiftISO(todayISO(), -29));
  const [customTo, setCustomTo] = useState(todayISO());
  const [exerciseId, setExerciseId] = useState("");
  const display = useDisplayDate();
  const settings = useSettings();
  const goal = useGoal();
  const today = todayISO(settings.data?.timezone);
  const from = range === "custom" ? customFrom : shiftISO(today, -Number(range) + 1);
  const to = range === "custom" ? customTo : today;
  const unit = settings.data?.weight_unit ?? "kg";
  const weights = useWeights();
  const sessions = useSessions(shiftISO(from, -1));
  const foods = useFoodLogs(from, to);
  const qs = [weights, sessions, foods, settings, goal];
  if (qs.some((q) => q.isPending)) return <LoadingBlock />;
  const failure = qs.find((q) => q.error);
  if (failure)
    return <ErrorBlock error={failure.error} retry={() => qs.forEach((q) => void q.refetch())} />;
  const weighIns = (weights.data ?? []).filter((w) => {
    const d = todayISO(settings.data?.timezone, new Date(w.measured_at));
    return d >= from && d <= to;
  });
  const workouts = (sessions.data ?? []).filter((s) => {
    const d = todayISO(settings.data?.timezone, new Date(s.started_at));
    return d >= from && d <= to;
  });
  const total = sumMacros(
    (foods.data ?? []).map((f) => ({
      calories: f.calories_snapshot,
      protein: f.protein_snapshot_g,
      carbs: f.carbs_snapshot_g,
      fat: f.fat_snapshot_g,
    })),
  );
  const dates = [...new Set(foods.data?.map((f) => f.log_date))].sort();
  const days = dates.length;
  const entries = dates.map((date) => ({
    date,
    calories: Math.round(
      (foods.data ?? [])
        .filter((f) => f.log_date === date)
        .reduce((n, l) => n + l.calories_snapshot, 0),
    ),
    protein: Math.round(
      (foods.data ?? [])
        .filter((f) => f.log_date === date)
        .reduce((n, l) => n + l.protein_snapshot_g, 0),
    ),
  }));
  const exerciseOptions = [
    ...new Map(
      workouts.flatMap((s) =>
        s.workout_session_exercises.map(
          (e) => [e.exercise_id, e.exercise?.name ?? "Exercise"] as const,
        ),
      ),
    ).entries(),
  ];
  const chosen = exerciseOptions.some(([id]) => id === exerciseId)
    ? exerciseId
    : exerciseOptions[0]?.[0];
  const performances = workouts
    .flatMap((s) => {
      const sets = s.workout_session_exercises
        .filter((e) => e.exercise_id === chosen)
        .flatMap((e) => e.workout_sets);
      if (!sets.length) return [];
      const timed = sets.some((s) => s.duration_seconds !== null);
      return [
        {
          date: display(s.started_at),
          value: timed
            ? Math.max(...sets.map((s) => s.duration_seconds ?? 0))
            : Math.max(...sets.map((s) => s.weight_kg ?? 0)),
        },
      ];
    })
    .reverse();
  const timed = workouts.some((s) =>
    s.workout_session_exercises.some(
      (e) => e.exercise_id === chosen && e.exercise?.tracking_type === "time",
    ),
  );
  const trainingDays = new Set(
    workouts.map((s) => todayISO(settings.data?.timezone, new Date(s.started_at))),
  ).size;
  const allSets = workouts.reduce(
    (n, s) => n + s.workout_session_exercises.reduce((m, e) => m + e.workout_sets.length, 0),
    0,
  );
  const g = goal.data;
  const latest = weights.data?.at(-1)?.weight_kg ?? g?.starting_weight_kg ?? null;
  const progress = g ? goalProgress(g.starting_weight_kg, latest, g.target_weight_kg) : null;
  return (
    <>
      <PageHeader
        title="Your reports"
        subtitle="See the bigger picture of your training, nutrition and progress."
      />
      <section className="mb-6 overflow-hidden rounded-3xl border bg-card">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Your activity snapshot
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">
                {display(from)} – {display(to)}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Built from your saved check-ins, completed workouts and meals.
              </p>
            </div>
          </div>
          <div className="max-w-full overflow-x-auto">
            <RangeTabs
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 bg-primary/[0.03] px-5 py-3 text-xs text-muted-foreground md:px-6">
          <span className="flex items-center gap-2">
            <Activity className="size-3.5 text-primary" />
            {weighIns.length} weigh-ins
          </span>
          <span className="flex items-center gap-2">
            <Dumbbell className="size-3.5 text-primary" />
            {trainingDays} training days
          </span>
          <span className="flex items-center gap-2">
            <Utensils className="size-3.5 text-primary" />
            {days} food days logged
          </span>
        </div>
      </section>
      {range === "custom" && (
        <div className="mb-6 grid max-w-xl grid-cols-2 gap-4 rounded-2xl border bg-card p-5">
          <Field label="From">
            <Input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => e.target.value && setCustomFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => e.target.value && setCustomTo(e.target.value)}
            />
          </Field>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Weekly weight change"
          value={
            avgWeeklyChange(weighIns) === null
              ? "—"
              : weightToDisplay(avgWeeklyChange(weighIns)!, unit)
          }
          unit={`${unit}/week`}
          hint="First to last measurement in this range"
        />
        <StatCard
          icon={Dumbbell}
          label="Completed workouts"
          value={workouts.length}
          hint={`${allSets} sets · ${trainingDays} training days logged`}
        />
        <StatCard
          icon={Flame}
          label="Average calories"
          value={days ? Math.round(total.calories / days) : "—"}
          unit="kcal"
          hint={`Per logged day · ${days} days logged`}
        />
        <StatCard
          icon={Beef}
          label="Average protein"
          value={days ? Math.round(total.protein / days) : "—"}
          unit="g"
          hint="Per logged day; unlogged days excluded"
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Weight over time
            </span>
          }
          action={
            <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
              {weighIns.length} entries
            </span>
          }
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Your recorded measurements in the selected period.
          </p>
          <WeightChart rows={weighIns} unit={unit} {...(g ? { target: g.target_weight_kg } : {})} />
        </Panel>
        <Panel title="Current goal">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Target className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Overall progress</p>
              <p className="text-2xl font-semibold">{progress ? `${progress.percent}%` : "—"}</p>
            </div>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Target weight</dt>
              <dd className="font-medium">
                {g ? `${weightToDisplay(g.target_weight_kg, unit)} ${unit}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Change from start</dt>
              <dd className="font-medium">
                {progress ? `${weightToDisplay(progress.change, unit)} ${unit}` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Current goal and all-time progress, independent of the report period.
          </p>
          <Button asChild variant="outline" className="mt-5 h-11 w-full rounded-xl">
            <Link to="/progress">
              View progress
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Dumbbell className="size-4 text-primary" />
              Workout history
            </span>
          }
          action={
            <span className="text-xs text-muted-foreground">{workouts.length} completed</span>
          }
        >
          <div className="max-h-96 space-y-3 overflow-auto">
            {workouts.map((s) => (
              <Link
                key={s.id}
                to="/workouts/history/$id"
                params={{ id: s.id }}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-elevated/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <div>
                  <strong className="text-sm font-medium">{s.title}</strong>
                  <p className="text-sm text-muted-foreground">
                    {display(s.started_at)} ·{" "}
                    {s.workout_session_exercises.reduce((n, e) => n + e.workout_sets.length, 0)}{" "}
                    sets ·{" "}
                    {trainingVolume(
                      s.workout_session_exercises.flatMap((e) =>
                        e.exercise?.tracking_type === "time" ? [] : e.workout_sets,
                      ),
                    )}{" "}
                    kg volume
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
            {!workouts.length && (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No completed workouts in this period.
              </p>
            )}
          </div>
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Exercise performance
            </span>
          }
        >
          <Field label="Exercise">
            <select
              className={selectClass}
              value={chosen ?? ""}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              {exerciseOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          {performances.length ? (
            <>
              <MetricChart
                rows={performances}
                unit={timed ? "sec" : "kg"}
                name={timed ? "Longest set" : "Highest recorded load"}
                line
              />
              <p className="text-xs text-muted-foreground">
                {timed
                  ? "Longest recorded timed set per workout."
                  : "Highest entered weight per workout. Compare sets using the same per-dumbbell or total-load basis."}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Log sets to see exercise performance.
            </p>
          )}
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Flame className="size-4 text-primary" />
              Calorie intake
            </span>
          }
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Daily totals for days with saved food entries.
          </p>
          {entries.length ? (
            <MetricChart
              rows={entries.map((e) => ({ date: display(e.date), value: e.calories }))}
              unit="kcal"
              name="Calories consumed"
              {...(g ? { target: g.daily_calorie_target } : {})}
            />
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No food logs in this period.
            </p>
          )}
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Beef className="size-4 text-primary" />
              Protein intake
            </span>
          }
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Protein from the food you logged each day.
          </p>
          {entries.length ? (
            <MetricChart
              rows={entries.map((e) => ({ date: display(e.date), value: e.protein }))}
              unit="g"
              name="Protein consumed"
              {...(g ? { target: g.daily_protein_target_g } : {})}
            />
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No food logs in this period.
            </p>
          )}
        </Panel>
      </div>
      <p className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        Dashed nutrition lines show your current targets, not historical targets. Missing food days
        are omitted. Exercise loads and training volume remain in kilograms.
      </p>
    </>
  );
}
