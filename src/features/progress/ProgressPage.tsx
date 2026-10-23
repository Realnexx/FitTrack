import { BmiCalculator } from "./bmi-calculator";
import { weightToDisplay, weightToKg, validateGoal } from "@/lib/measurements";
import { useSettings } from "@/lib/data";
import { useDisplayDate } from "@/hooks/use-display-date";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoal, useWeights, useAction, unwrap, uid, qk, type WeightLog } from "@/lib/data";
import { goalProgress } from "@/lib/calc";
import { todayISO, shiftISO } from "@/lib/dates";
import {
  PageHeader,
  Panel,
  LoadingBlock,
  ErrorBlock,
  ConfirmDialog,
  RangeTabs,
} from "@/components/common";
import { Field, values } from "@/components/fields";
import { WeightChart } from "@/components/weight-chart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Target,
  Scale,
  TrendingUp,
  CalendarDays,
  ArrowUpRight,
  SlidersHorizontal,
  History,
  Flag,
} from "lucide-react";
import { MeasurementModal, GoalModal } from "./progress-modals";
export function ProgressPage() {
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const settings = useSettings();
  const unit = settings.data?.weight_unit ?? "kg";
  const display = useDisplayDate();
  const weights = useWeights();
  const goal = useGoal();
  const [editing, setEditing] = useState<WeightLog | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [range, setRange] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formKey, setFormKey] = useState(0);
  const qc = useQueryClient();
  const save = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      const date = new Date(v.text("date"));
      if (!Number.isFinite(date.getTime()) || date > new Date())
        throw new Error("Choose a valid measurement date that is not in the future.");
      const record = {
        weight_kg: weightToKg(v.num("weight"), unit),
        measured_at: date.toISOString(),
        notes: v.text("notes") || null,
        user_id: await uid(),
      };
      unwrap(
        editing
          ? await supabase.from("weight_logs").update(record).eq("id", editing.id)
          : await supabase.from("weight_logs").insert(record),
      );
    },
    {
      invalidate: [["weights"]],
      success: "Weight saved",
      onSuccess: () => {
        setEditing(null);
        setMeasurementOpen(false);
        setFormKey((x) => x + 1);
      },
    },
  );
  const remove = useAction(
    async (id: string) => unwrap(await supabase.from("weight_logs").delete().eq("id", id)),
    {
      invalidate: [["weights"]],
      success: "Measurement deleted",
      onSuccess: () => setDeleting(null),
    },
  );
  const saveGoal = useAction(
    async (form: HTMLFormElement) => {
      if (!goal.data) throw new Error("Finish onboarding first.");
      const v = values(form);
      validateGoal(
        goal.data.starting_weight_kg,
        weightToKg(v.num("target"), unit),
        weightToKg(v.num("weekly"), unit),
        v.text("type"),
      );
      unwrap(
        await supabase
          .from("fitness_goals")
          .update({
            goal_type: v.text("type"),
            target_weight_kg: weightToKg(v.num("target"), unit),
            weekly_weight_change_target_kg: weightToKg(v.num("weekly"), unit),
            daily_calorie_target: v.num("calories"),
            daily_protein_target_g: v.num("protein"),
          })
          .eq("id", goal.data.id),
      );
    },
    { invalidate: [qk.goal], success: "Goals updated", onSuccess: () => setGoalOpen(false) },
  );
  if (weights.isPending || goal.isPending || settings.isPending) return <LoadingBlock />;
  if (weights.error || goal.error || settings.error)
    return (
      <ErrorBlock
        error={weights.error || goal.error || settings.error}
        retry={() => {
          void qc.invalidateQueries();
        }}
      />
    );
  const rows = weights.data ?? [];
  const g = goal.data;
  const latest = rows.at(-1)?.weight_kg ?? g?.starting_weight_kg ?? 0;
  const progress = g ? goalProgress(g.starting_weight_kg, latest, g.target_weight_kg) : null;
  const filtered = rows.filter(
    (r) =>
      (range === "all" ||
        todayISO(settings.data?.timezone, new Date(r.measured_at)) >=
          shiftISO(todayISO(settings.data?.timezone), -Number(range) + 1)) &&
      (!from || todayISO(settings.data?.timezone, new Date(r.measured_at)) >= from) &&
      (!to || todayISO(settings.data?.timezone, new Date(r.measured_at)) <= to),
  );
  return (
    <>
      <PageHeader
        title="Your progress"
        subtitle="Build consistency. Watch your story unfold."
        actions={
          <Button
            className="h-11 rounded-xl"
            onClick={() => {
              setEditing(null);
              setFormKey((x) => x + 1);
              setMeasurementOpen(true);
            }}
          >
            <Plus className="size-4" />
            Log weight
          </Button>
        }
      />
      <BmiCalculator weightKg={latest} />
      <section className="relative mb-6 overflow-hidden rounded-3xl border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Target className="size-4" />
              {g ? g.goal_type.replaceAll("_", " ") : "Your weight journey"}
            </p>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              Progress, one check-in at a time.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {rows.length
                ? `${rows.length} recorded measurements. Focus on the trend over time, and keep showing up for yourself.`
                : "Log your first measurement to start seeing your progress over time."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
                Start{" "}
                <strong className="ml-1 text-foreground">
                  {g ? weightToDisplay(g.starting_weight_kg, unit) : "—"} {unit}
                </strong>
              </span>
              <span className="rounded-full border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
                Target{" "}
                <strong className="ml-1 text-foreground">
                  {g ? weightToDisplay(g.target_weight_kg, unit) : "—"} {unit}
                </strong>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-5 sm:flex-col sm:gap-2">
            <div className="relative grid size-32 place-items-center">
              <svg
                viewBox="0 0 120 120"
                className="absolute inset-0 size-full -rotate-90"
                aria-hidden="true"
              >
                <circle cx="60" cy="60" r="51" fill="none" stroke="var(--border)" strokeWidth="7" />
                <circle
                  cx="60"
                  cy="60"
                  r="51"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="320.44"
                  strokeDashoffset={
                    320.44 * (1 - Math.min(100, Math.max(0, progress?.percent ?? 0)) / 100)
                  }
                />
              </svg>
              <div className="text-center">
                <p className="font-display text-3xl font-semibold">
                  {progress?.percent ?? 0}
                  <span className="text-base text-muted-foreground">%</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  of your goal
                </p>
              </div>
            </div>
            <p className="text-xs capitalize text-muted-foreground">
              {progress?.status.replaceAll("_", " ") ?? "Set your goal"}
            </p>
          </div>
        </div>
      </section>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Latest weight",
            value: rows.length ? weightToDisplay(latest, unit) : "—",
            suffix: unit,
            hint: rows.length ? display(rows.at(-1)!.measured_at) : "No measurements yet",
            icon: Scale,
          },
          {
            label: "Change from start",
            value: progress
              ? `${progress.change > 0 ? "+" : ""}${weightToDisplay(progress.change, unit)}`
              : "—",
            suffix: unit,
            hint: "Compared with your starting weight",
            icon: TrendingUp,
          },
          {
            label: "Check-ins",
            value: rows.length,
            suffix: "total",
            hint: "Every measurement counts",
            icon: CalendarDays,
          },
        ].map(({ label, value, suffix, hint, icon: Icon }) => (
          <Panel key={label}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="font-display text-3xl font-semibold">
              {value} <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          </Panel>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
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
                  { value: "all", label: "All" },
                ]}
              />
            }
          >
            <WeightChart
              unit={unit}
              rows={filtered}
              {...(g ? { target: g.target_weight_kg } : {})}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
          </Panel>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                Measurement history
              </span>
            }
            action={
              <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
            }
          >
            <div className="space-y-3">
              {[...filtered].reverse().map((r) => (
                <div
                  key={r.id}
                  data-testid="weight-entry"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-elevated/20 p-4"
                >
                  <div>
                    <strong>
                      {weightToDisplay(r.weight_kg, unit)} {unit}
                    </strong>
                    <p className="text-sm text-muted-foreground">{display(r.measured_at)}</p>
                    {r.notes && <p className="text-sm">{r.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setEditing(r);
                        setMeasurementOpen(true);
                        setFormKey((x) => x + 1);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleting(r.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <p className="text-sm text-muted-foreground">No measurements in this date range.</p>
              )}
            </div>
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel
            title="Your targets"
            action={
              g && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit targets"
                  className="size-8 rounded-xl"
                  onClick={() => setGoalOpen(true)}
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
              )
            }
          >
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-primary/5 p-4">
              <Flag className="size-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Target weight</p>
                <p className="mt-1 text-xl font-semibold">
                  {g ? weightToDisplay(g.target_weight_kg, unit) : "—"}{" "}
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </p>
              </div>
            </div>
            <dl className="space-y-4 text-sm">
              {[
                [
                  "Weekly change",
                  g ? `${weightToDisplay(g.weekly_weight_change_target_kg, unit)} ${unit}` : "—",
                ],
                ["Daily calories", g ? `${g.daily_calorie_target} kcal` : "—"],
                ["Daily protein", g ? `${g.daily_protein_target_g} g` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {g && (
              <Button
                variant="outline"
                className="mt-6 h-11 w-full rounded-xl"
                onClick={() => setGoalOpen(true)}
              >
                Adjust targets
                <ArrowUpRight className="size-4" />
              </Button>
            )}
          </Panel>
          <div className="rounded-2xl border border-dashed p-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Scale className="size-4 text-primary" />
              Make check-ins consistent
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Try weighing at a similar time of day. Daily fluctuations are normal; your longer-term
              trend gives more context.
            </p>
          </div>
        </aside>
      </div>
      <MeasurementModal
        key={formKey}
        open={measurementOpen}
        onClose={() => {
          setMeasurementOpen(false);
          setEditing(null);
        }}
        pending={save.isPending}
        onSave={(form) => save.mutate(form)}
        editing={editing}
        latest={latest}
        unit={unit}
      />
      {g && (
        <GoalModal
          open={goalOpen}
          onClose={() => setGoalOpen(false)}
          pending={saveGoal.isPending}
          onSave={(form) => saveGoal.mutate(form)}
          unit={unit}
          g={g}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete measurement?"
        body="This recorded measurement will be permanently removed."
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
