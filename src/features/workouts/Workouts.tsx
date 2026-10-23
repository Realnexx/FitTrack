import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import {
  Dumbbell,
  Plus,
  ArrowUpRight,
  CalendarDays,
  Play,
  Clock3,
  ChevronRight,
  Trash2,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  usePlans,
  useExercises,
  useSchedule,
  useSessions,
  useActiveSession,
  useAction,
  unwrap,
  uid,
  qk,
} from "@/lib/data";
import { DAY_NAMES, todayISO, fmtDuration, parseISODate, shiftISO } from "@/lib/dates";
import { scheduledPlanFor } from "@/lib/calc";
import { PageHeader, Panel, LoadingBlock, ErrorBlock, ConfirmDialog } from "@/components/common";
import { Field, selectClass, values } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExerciseLibrary } from "@/components/exercise-guide";
import { ResponsiveModal } from "@/components/responsive-modal";
import { WorkoutPlanDetails, WorkoutHistoryDetails } from "./workout-details";
import { PlanEditor } from "./plan-editor";
export { PlanEditor } from "./plan-editor";
import { ModalActionBar, ModalFormActions } from "@/components/modal-actions";
export function Workouts() {
  const createFormId = useId();
  const scheduleFormId = useId();
  const plans = usePlans(),
    exercises = useExercises(),
    schedule = useSchedule(),
    sessions = useSessions(),
    active = useActiveSession();
  const [selected, setSelected] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<
    "details" | "edit" | "create" | "schedule" | "history" | null
  >(null);
  const [historyId, setHistoryId] = useState("");
  const navigate = useNavigate();
  const create = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      const p = unwrap(
        await supabase
          .from("workout_plans")
          .insert({
            user_id: await uid(),
            name: v.text("name"),
            description: v.text("description"),
          })
          .select()
          .single(),
      );
      if (!p) throw new Error("Plan could not be created.");
      return p;
    },
    {
      invalidate: [qk.plans],
      success: "Plan created",
      onSuccess: (p) => {
        setSelected(p.id);
        setOverlay("edit");
      },
    },
  );
  const remove = useAction(
    async (id: string) => unwrap(await supabase.from("workout_plans").delete().eq("id", id)),
    {
      invalidate: [qk.plans, qk.schedule],
      success: "Plan deleted",
      onSuccess: () => {
        setSelected("");
        setDeleting(null);
        setOverlay(null);
      },
    },
  );
  const start = useAction(
    async (id: string) => {
      const result = unwrap(await supabase.rpc("start_workout", { plan_id: id }));
      if (!result) throw new Error("Workout could not be started.");
      return result;
    },
    {
      invalidate: [qk.activeSession],
      onSuccess: (id) => {
        setOverlay(null);
        void navigate({ to: "/workouts/session/$id", params: { id } });
      },
    },
  );
  const saveSchedule = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      unwrap(
        await supabase.rpc("set_workout_day", {
          plan_id: v.text("plan"),
          day_number: v.num("day"),
          parity: v.text("parity"),
        }),
      );
    },
    { invalidate: [qk.schedule], success: "Schedule updated", onSuccess: () => setOverlay(null) },
  );
  const deleteSchedule = useAction(
    async (id: string) => unwrap(await supabase.from("workout_schedule").delete().eq("id", id)),
    { invalidate: [qk.schedule], success: "Scheduled day removed" },
  );
  const queries = [plans, exercises, schedule, sessions, active];
  if (queries.some((q) => q.isPending)) return <LoadingBlock />;
  const failure = queries.find((q) => q.error);
  if (failure)
    return (
      <ErrorBlock error={failure.error} retry={() => queries.forEach((q) => void q.refetch())} />
    );
  const today = todayISO(),
    weekStart = shiftISO(today, -((parseISODate(today).getDay() + 6) % 7));
  const currentPlan = plans.data?.find(
    (p) => p.id === scheduledPlanFor(parseISODate(today), schedule.data ?? []),
  );
  const selectedName = plans.data?.find((p) => p.id === selected)?.name ?? "Workout plan";
  return (
    <>
      <PageHeader
        title="Your training, in focus"
        subtitle="Build your routine. Show up. Get stronger."
        actions={
          <Button onClick={() => setOverlay("create")}>
            <Plus className="size-4" />
            New plan
          </Button>
        }
      />
      <section className="mb-7 grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-[1fr_auto]">
        <div className="p-6 md:p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {active.data
              ? "Keep your momentum"
              : currentPlan
                ? "On your schedule today"
                : "Make time for your next session"}
          </p>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">
            {active.data?.title ?? currentPlan?.name ?? "A little progress, every session."}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {active.data
              ? "Your saved sets are ready. Pick up where you left off."
              : (currentPlan?.description ??
                "Choose a routine below or create a plan that fits your goals and equipment.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {active.data ? (
              <Button asChild>
                <Link to="/workouts/session/$id" params={{ id: active.data.id }}>
                  <Play className="size-4" />
                  Resume workout
                </Link>
              </Button>
            ) : currentPlan ? (
              <Button disabled={start.isPending} onClick={() => start.mutate(currentPlan.id)}>
                <Play className="size-4" />
                Start today's workout
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOverlay("create")}>
                <Plus className="size-4" />
                Build a routine
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOverlay("schedule")}>
              <CalendarDays className="size-4" />
              Manage schedule
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t bg-elevated/20 lg:min-w-60 lg:grid-cols-1 lg:border-l lg:border-t-0">
          {[
            { label: "Workout plans", value: plans.data?.length ?? 0, icon: Dumbbell },
            { label: "Exercises to explore", value: exercises.data?.length ?? 0, icon: Layers },
            { label: "Recent completions", value: sessions.data?.length ?? 0, icon: Clock3 },
          ].map((x) => (
            <div
              key={x.label}
              className="flex flex-col justify-center border-b p-4 last:border-0 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-6"
            >
              <div>
                <p className="text-xl font-semibold tabular-nums">{x.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{x.label}</p>
              </div>
              <x.icon className="hidden size-5 text-muted-foreground lg:block" aria-hidden />
            </div>
          ))}
        </div>
      </section>
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">This week's rhythm</h2>
          <Button variant="ghost" size="sm" onClick={() => setOverlay("schedule")}>
            Edit schedule
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[560px] grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const date = shiftISO(weekStart, i),
                plan = plans.data?.find(
                  (p) => p.id === scheduledPlanFor(parseISODate(date), schedule.data ?? []),
                );
              return (
                <button
                  key={date}
                  onClick={() => {
                    if (plan) {
                      setSelected(plan.id);
                      setOverlay("details");
                    } else setOverlay("schedule");
                  }}
                  className={`min-h-28 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 ${date === today ? "border-primary/60 bg-primary/10" : "bg-card"}`}
                  aria-label={
                    DAY_NAMES[parseISODate(date).getDay()] + ", " + (plan?.name ?? "Rest day")
                  }
                >
                  <span className="block text-xs text-muted-foreground">
                    {DAY_NAMES[parseISODate(date).getDay()]}
                  </span>
                  <span className="mt-1 block text-xl font-semibold">
                    {parseISODate(date).getDate()}
                  </span>
                  <span
                    className={`mt-3 block truncate text-[11px] ${plan ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {plan?.name ?? "Rest day"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-7">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Your workout plans</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a routine to explore its exercises and targets.
                </p>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                {plans.data?.length ?? 0} plans
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {plans.data?.map((p, i) => (
                <article
                  key={p.id}
                  className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Dumbbell className="size-5" />
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setDeleting(p.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Routine {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                    {p.description || "A routine built around your training."}
                  </p>
                  <p className="my-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="size-3.5" />
                    {p.workout_plan_exercises.length} exercises
                  </p>
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      className="flex-1"
                      disabled={start.isPending}
                      onClick={() => start.mutate(p.id)}
                    >
                      <Play className="size-3.5" />
                      Start workout
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected(p.id);
                        setOverlay("details");
                      }}
                    >
                      View details
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {!plans.data?.length && (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <Dumbbell className="mx-auto mb-3 size-7 text-primary" />
                <h3 className="font-semibold">Your first routine starts here</h3>
                <p className="my-3 text-sm text-muted-foreground">
                  Add your exercises, sets, and targets to make a plan your own.
                </p>
                <Button onClick={() => setOverlay("create")}>Create your first plan</Button>
              </div>
            )}
          </section>
          <ExerciseLibrary exercises={exercises.data ?? []} />
        </div>
        <Panel
          title="Recent sessions"
          action={
            <Link to="/workouts/history" className="text-xs text-primary">
              View all
            </Link>
          }
        >
          {sessions.data?.length ? (
            <div className="space-y-1">
              {sessions.data.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-4 text-left transition-colors hover:bg-elevated"
                  onClick={() => {
                    setHistoryId(s.id);
                    setOverlay("history");
                  }}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-elevated">
                    <Dumbbell className="size-4 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{s.title}</strong>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString()} ·{" "}
                      {fmtDuration(
                        (new Date(s.ended_at ?? s.started_at).getTime() -
                          new Date(s.started_at).getTime()) /
                          1000,
                      )}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Clock3 className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="text-sm font-medium">Your training story starts here</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Completed workouts will appear here, ready to review.
              </p>
            </div>
          )}
        </Panel>
      </div>
      <ResponsiveModal
        open={overlay !== null}
        onOpenChange={(o) => !o && setOverlay(null)}
        title={
          overlay === "create"
            ? "Create a workout plan"
            : overlay === "schedule"
              ? "Your training schedule"
              : overlay === "history"
                ? "Workout summary"
                : overlay === "edit"
                  ? "Edit workout plan"
                  : selectedName
        }
        description={
          overlay === "schedule"
            ? "Set your training days and alternating routines."
            : overlay === "create"
              ? "Give your routine a name, then add your exercises."
              : overlay === "edit"
                ? "Adjust exercises, order and training targets."
                : overlay === "history"
                  ? "Review the sets and effort you recorded."
                  : "Your exercises, targets and movement guides, in one place."
        }
      >
        {overlay === "details" && selected && (
          <WorkoutPlanDetails
            id={selected}
            onEdit={() => setOverlay("edit")}
            onStart={() => start.mutate(selected)}
            starting={start.isPending}
          />
        )}
        {overlay === "edit" && selected && (
          <PlanEditor id={selected} close={() => setOverlay(null)} embedded />
        )}
        {overlay === "history" && historyId && <WorkoutHistoryDetails id={historyId} />}
        {overlay === "create" && (
          <form
            id={createFormId}
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(e.currentTarget);
            }}
          >
            <Field label="New plan name">
              <Input
                name="name"
                placeholder="e.g. Full body strength"
                required
                maxLength={100}
                autoFocus
              />
            </Field>
            <Field label="Description">
              <Input
                name="description"
                placeholder="What will this routine focus on?"
                maxLength={300}
              />
            </Field>
          </form>
        )}
        {overlay === "schedule" && (
          <div className="space-y-6">
            <div className="space-y-2">
              {[...(schedule.data ?? [])]
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {DAY_NAMES[s.day_of_week]} ·{" "}
                        {plans.data?.find((p) => p.id === s.workout_plan_id)?.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.week_parity === "all" ? "Every week" : `${s.week_parity} ISO weeks`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleteSchedule.isPending}
                      onClick={() => deleteSchedule.mutate(s.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
            </div>
            <form
              id={scheduleFormId}
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveSchedule.mutate(e.currentTarget);
              }}
            >
              <Field label="Day">
                <select name="day" className={selectClass}>
                  {DAY_NAMES.map((d, i) => (
                    <option value={i} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Plan">
                <select name="plan" className={selectClass} required>
                  {plans.data?.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Week">
                <select name="parity" className={selectClass}>
                  <option value="all">Every week</option>
                  <option value="odd">Odd ISO weeks</option>
                  <option value="even">Even ISO weeks</option>
                </select>
              </Field>
            </form>
          </div>
        )}
        {overlay === "create" && (
          <ModalActionBar>
            <ModalFormActions
              form={createFormId}
              onCancel={() => setOverlay(null)}
              pending={create.isPending}
              label="Create plan"
              pendingLabel="Creating plan..."
              hint="Add exercises after creating your plan."
            />
          </ModalActionBar>
        )}
        {overlay === "schedule" && (
          <ModalActionBar>
            <ModalFormActions
              form={scheduleFormId}
              onCancel={() => setOverlay(null)}
              pending={saveSchedule.isPending}
              disabled={!plans.data?.length}
              label="Save scheduled day"
              hint="Build a routine that fits your week."
            />
          </ModalActionBar>
        )}
      </ResponsiveModal>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete workout plan?"
        body="The plan and its scheduled days will be removed. Your completed workout history will remain."
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
