import { Button } from "@/components/ui/button";
import { LoadingBlock, ErrorBlock } from "@/components/common";
import { usePlan, useSession } from "@/lib/data";
import { fmtDuration } from "@/lib/dates";
import { trainingVolume } from "@/lib/calc";
import { ExerciseInstructions } from "@/components/exercise-guide";
import { Dumbbell, Timer, Layers } from "lucide-react";
export function WorkoutPlanDetails({
  id,
  onEdit,
  onStart,
  starting,
}: {
  id: string;
  onEdit: () => void;
  onStart: () => void;
  starting: boolean;
}) {
  const query = usePlan(id);
  if (query.isPending) return <LoadingBlock />;
  if (query.error) return <ErrorBlock error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <p>This plan is no longer available.</p>;
  const { plan, items } = query.data;
  return (
    <div className="space-y-6">
      <div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {plan.description || "Your personal workout routine."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DetailStat icon={Dumbbell} label="Exercises" value={String(items.length)} />
        <DetailStat
          icon={Layers}
          label="Planned sets"
          value={String(items.reduce((n, e) => n + e.target_sets, 0))}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={starting || !items.length} onClick={onStart}>
          {starting ? "Starting…" : "Start workout"}
        </Button>
        <Button variant="outline" onClick={onEdit}>
          Edit plan
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((e, i) => (
          <details key={e.id} className="group rounded-xl border p-4">
            <summary className="cursor-pointer list-none">
              <span className="mb-2 inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h4 className="font-semibold">{e.exercise.name}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {e.target_sets} sets ×{" "}
                {e.exercise.tracking_type === "time"
                  ? `${e.target_duration_seconds}s`
                  : `${e.target_reps_min}–${e.target_reps_max} reps`}{" "}
                · {e.rest_seconds}s rest
              </p>
              <span className="mt-2 inline-block text-xs text-primary">View movement guide</span>
            </summary>
            <ExerciseInstructions name={e.exercise.name} instructions={e.exercise.instructions} />
          </details>
        ))}
      </div>
      {!items.length && (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Add exercises in the plan editor to start this workout.
        </p>
      )}
    </div>
  );
}
function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-elevated/40 p-4">
      <Icon className="mb-3 size-4 text-primary" aria-hidden />
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
export function WorkoutHistoryDetails({ id }: { id: string }) {
  const query = useSession(id);
  if (query.isPending) return <LoadingBlock />;
  if (query.error) return <ErrorBlock error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <p>Workout not found.</p>;
  const { session, exercises } = query.data;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl font-semibold">{session.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {new Date(session.started_at).toLocaleString()} · {session.status.replaceAll("_", " ")}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <DetailStat
          icon={Timer}
          label="Duration"
          value={fmtDuration(
            (new Date(session.ended_at ?? session.started_at).getTime() -
              new Date(session.started_at).getTime()) /
              1000,
          )}
        />
        <DetailStat
          icon={Layers}
          label="Sets logged"
          value={String(exercises.reduce((n, e) => n + e.sets.length, 0))}
        />
        <DetailStat
          icon={Dumbbell}
          label="Volume (kg)"
          value={String(
            trainingVolume(
              exercises.flatMap((e) => (e.exercise.tracking_type === "time" ? [] : e.sets)),
            ),
          )}
        />
      </div>
      {exercises.map((e) => (
        <section key={e.id} className="rounded-xl border p-4">
          <h4 className="font-semibold">{e.exercise.name}</h4>
          <p className="my-2 text-xs capitalize text-muted-foreground">{e.status}</p>
          <div className="space-y-2">
            {e.sets.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg bg-elevated/60 px-3 py-2 text-sm"
              >
                <span>Set {s.set_number}</span>
                <span className="text-muted-foreground">
                  {s.duration_seconds !== null
                    ? `${s.duration_seconds}s`
                    : `${s.repetitions} reps × ${s.weight_kg ?? 0} kg · ${s.weight_basis.replaceAll("_", " ")}`}
                  {s.side ? ` · ${s.side}` : ""}
                </span>
              </div>
            ))}
            {!e.sets.length && <p className="text-sm text-muted-foreground">No sets recorded.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
