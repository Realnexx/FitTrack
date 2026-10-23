import { weightToDisplay } from "@/lib/measurements";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Dumbbell, Utensils, TrendingUp } from "lucide-react";
import {
  useProfile,
  useSettings,
  useGoal,
  useWeights,
  useFoodLogs,
  usePlans,
  useSchedule,
  useSessions,
  useActiveSession,
} from "@/lib/data";
import { goalProgress, scheduledPlanFor, sumMacros } from "@/lib/calc";
import { todayISO, shiftISO, parseISODate } from "@/lib/dates";
import {
  PageHeader,
  Panel,
  StatCard,
  ProgressBar,
  EmptyState,
  LoadingBlock,
  ErrorBlock,
  RangeTabs,
} from "@/components/common";
import { WeightChart } from "@/components/weight-chart";
import { Button } from "@/components/ui/button";
export function Dashboard() {
  const profile = useProfile();
  const settings = useSettings();
  const today = todayISO(settings.data?.timezone);
  const unit = settings.data?.weight_unit ?? "kg";
  const goal = useGoal();
  const weights = useWeights();
  const food = useFoodLogs(today, today);
  const plans = usePlans();
  const schedule = useSchedule();
  const sessions = useSessions(shiftISO(today, -7));
  const active = useActiveSession();
  const [range, setRange] = useState("30");
  const queries = [profile, settings, goal, weights, food, plans, schedule, sessions, active];
  if (queries.some((q) => q.isPending)) return <LoadingBlock rows={5} />;
  const failed = queries.find((q) => q.error);
  if (failed)
    return (
      <ErrorBlock
        error={failed.error}
        retry={() => {
          queries.forEach((q) => void q.refetch());
        }}
      />
    );
  const weeklySessions = (sessions.data ?? []).filter((s) => {
    const day = todayISO(settings.data?.timezone, new Date(s.started_at));
    return day >= shiftISO(today, -6) && day <= today;
  });
  const g = goal.data;
  const latest = weights.data?.at(-1)?.weight_kg ?? g?.starting_weight_kg ?? null;
  const gp = g ? goalProgress(g.starting_weight_kg, latest, g.target_weight_kg) : null;
  const totals = sumMacros(
    (food.data ?? []).map((f) => ({
      calories: f.calories_snapshot,
      protein: f.protein_snapshot_g,
      carbs: f.carbs_snapshot_g,
      fat: f.fat_snapshot_g,
    })),
  );
  const planId = scheduledPlanFor(parseISODate(today), schedule.data ?? []);
  const plan = plans.data?.find((p) => p.id === planId);
  const completed = sessions.data?.some(
    (s) =>
      todayISO(settings.data?.timezone, new Date(s.started_at)) === today &&
      s.workout_plan_id === planId,
  );
  return (
    <>
      <PageHeader
        title={`Welcome back, ${profile.data?.full_name?.split(" ")[0] || "you"}`}
        subtitle={`${new Date(today + "T12:00:00").toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })} · ${g?.goal_type.replaceAll("_", " ") ?? "Set your goal"}`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current weight"
          value={latest === null ? "—" : weightToDisplay(latest, unit)}
          unit={unit}
          icon={Activity}
          hint={`Starting ${g ? weightToDisplay(g.starting_weight_kg, unit) : "—"} · target ${g ? weightToDisplay(g.target_weight_kg, unit) : "—"} ${unit}`}
        />
        <StatCard
          label="Calories today"
          value={totals.calories}
          unit="kcal"
          icon={Utensils}
          hint={`Target ${g?.daily_calorie_target ?? "—"} kcal`}
        />
        <StatCard
          label="Protein today"
          value={totals.protein}
          unit="g"
          hint={`Target ${g?.daily_protein_target_g ?? "—"} g`}
        />
        <StatCard label="Workouts in 7 days" value={weeklySessions.length} icon={Dumbbell} />
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { to: "/progress", label: "Log weight" },
          { to: "/workouts", label: active.data ? "Resume workout" : "Start workout" },
          { to: "/nutrition", label: "Log meal" },
          { to: "/reports", label: "View reports" },
        ].map((l) => (
          <Button key={l.to} asChild variant="outline">
            <Link to={l.to}>{l.label}</Link>
          </Button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Weight trend"
          action={
            <RangeTabs
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7d" },
                { value: "30", label: "30d" },
                { value: "90", label: "90d" },
              ]}
            />
          }
        >
          <WeightChart
            unit={unit}
            rows={(weights.data ?? []).filter(
              (w) =>
                todayISO(settings.data?.timezone, new Date(w.measured_at)) >=
                shiftISO(today, -Number(range) + 1),
            )}
            {...(g ? { target: g.target_weight_kg } : {})}
          />
        </Panel>
        <Panel title="Today's nutrition">
          <p className="mb-2 text-sm">
            {totals.calories} / {g?.daily_calorie_target ?? 0} kcal
          </p>
          <ProgressBar
            value={totals.calories}
            max={g?.daily_calorie_target ?? 0}
            label="Daily calories"
          />
          <p className="mb-2 mt-6 text-sm">
            {totals.protein} / {g?.daily_protein_target_g ?? 0} g protein
          </p>
          <ProgressBar
            value={totals.protein}
            max={g?.daily_protein_target_g ?? 0}
            label="Daily protein"
            tone="info"
          />
          <p className="mt-6 text-sm text-muted-foreground">
            {food.data?.length ?? 0} food entries logged today. Only consumed meals count.
          </p>
        </Panel>
        <Panel title="Today's workout">
          {plan ? (
            <>
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="my-3 text-sm text-muted-foreground">
                {plan.workout_plan_exercises.length} exercises ·{" "}
                {completed ? "Completed" : "Scheduled"}
              </p>
              <Button asChild>
                <Link to="/workouts">
                  {active.data ? "Resume workout" : completed ? "View workouts" : "Start workout"}
                </Link>
              </Button>
            </>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="No workout scheduled"
              body="Enjoy a rest day, or choose a plan from Workouts."
            />
          )}
        </Panel>
        <Panel title="Daily summary">
          <div className="space-y-4 text-sm">
            <p>
              Weight goal: {gp?.status.replaceAll("_", " ") ?? "No active goal"} ·{" "}
              {gp?.percent ?? 0}%
            </p>
            <ProgressBar value={gp?.percent ?? 0} max={100} label="Weight goal" />
            <p>
              Weight change: {weightToDisplay(gp?.change ?? 0, unit)} {unit}
            </p>
            <p>
              Workout:{" "}
              {active.data
                ? "In progress"
                : completed
                  ? "Completed"
                  : plan
                    ? "Scheduled"
                    : "Rest day"}
            </p>
            <Link to="/reports" className="inline-flex items-center gap-2 text-primary">
              Explore progress <TrendingUp className="size-4" />
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
