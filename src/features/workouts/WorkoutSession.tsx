import { ExerciseGuideTrigger } from "@/components/exercise-guide";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useSession,
  useAction,
  unwrap,
  uid,
  qk,
  type SessionExercise,
  type WorkoutSet,
} from "@/lib/data";
import { trainingVolume } from "@/lib/calc";
import { fmtDuration } from "@/lib/dates";
import { PageHeader, Panel, LoadingBlock, ErrorBlock, ConfirmDialog } from "@/components/common";
import { Field, NumberField, selectClass, values } from "@/components/fields";
import { Button } from "@/components/ui/button";
export function WorkoutSession({ id }: { id: string }) {
  const query = useSession(id);
  const [now, setNow] = useState(Date.now());
  const [deadline, setDeadline] = useState<number | null>(null);
  const [paused, setPaused] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<"completed" | "cancelled" | null>(null);
  const [editing, setEditing] = useState<WorkoutSet | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`rest-${id}`) ?? "null") as {
        deadline: number | null;
        paused: number | null;
      } | null;
      if (saved) {
        setDeadline(saved.deadline);
        setPaused(saved.paused);
      }
    } catch {}
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [id]);
  function persistRest(value: { deadline: number | null; paused: number | null }) {
    try {
      localStorage.setItem(`rest-${id}`, JSON.stringify(value));
    } catch {
      /* Browser storage can be unavailable; saved sets remain in the database. */
    }
  }
  function rest(seconds: number) {
    const end = Date.now() + seconds * 1000;
    setDeadline(end);
    setPaused(null);
    persistRest({ deadline: end, paused: null });
  }
  function toggleRest() {
    if (deadline) {
      const remaining = Math.max(0, deadline - Date.now());
      setPaused(remaining);
      setDeadline(null);
      persistRest({ deadline: null, paused: remaining });
    } else if (paused !== null) {
      const end = Date.now() + paused;
      setDeadline(end);
      setPaused(null);
      persistRest({ deadline: end, paused: null });
    }
  }
  const save = useAction(
    async ({ exercise, form }: { exercise: SessionExercise; form: HTMLFormElement }) => {
      const v = values(form);
      const currentEdit = editing?.workout_session_exercise_id === exercise.id ? editing : null;
      const record = {
        user_id: await uid(),
        workout_session_exercise_id: exercise.id,
        set_number:
          currentEdit?.set_number ?? Math.max(0, ...exercise.sets.map((s) => s.set_number)) + 1,
        repetitions: exercise.exercise.tracking_type === "time" ? null : v.num("reps"),
        duration_seconds: exercise.exercise.tracking_type === "time" ? v.num("duration") : null,
        weight_kg: exercise.exercise.tracking_type === "time" ? null : v.num("weight"),
        weight_basis: v.text("basis") || "bodyweight",
        side: exercise.exercise.is_unilateral ? v.text("side") : null,
      };
      unwrap(
        currentEdit
          ? await supabase.from("workout_sets").update(record).eq("id", currentEdit!.id)
          : await supabase.from("workout_sets").insert(record),
      );
      if (!currentEdit) rest(exercise.rest_seconds);
      setEditing(null);
    },
    { invalidate: [qk.session(id)], success: "Set saved" },
  );
  const status = useAction(
    async ({ exercise, state }: { exercise: string; state: string }) =>
      unwrap(
        await supabase
          .from("workout_session_exercises")
          .update({ status: state })
          .eq("id", exercise),
      ),
    { invalidate: [qk.session(id)] },
  );
  const finish = useAction(
    async (state: "completed" | "cancelled") => {
      if (state === "completed" && !query.data?.exercises.some((e) => e.sets.length))
        throw new Error("Log at least one set before finishing.");
      unwrap(
        await supabase
          .from("workout_sessions")
          .update({ status: state, ended_at: new Date().toISOString() })
          .eq("id", id),
      );
      try {
        localStorage.removeItem(`rest-${id}`);
      } catch {}
      setDeadline(null);
      setPaused(null);
    },
    {
      invalidate: [qk.session(id), qk.activeSession, ["sessions"]],
      success: "Workout saved",
      onSuccess: () => setConfirm(null),
    },
  );
  const remove = useAction(
    async (set: string) => unwrap(await supabase.from("workout_sets").delete().eq("id", set)),
    { invalidate: [qk.session(id)], success: "Set deleted" },
  );
  if (query.isPending) return <LoadingBlock />;
  if (query.error) return <ErrorBlock error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <ErrorBlock error="Workout not found or access denied." />;
  const { session, exercises } = query.data;
  const running = session.status === "in_progress";
  const duration =
    (new Date(session.ended_at ?? now).getTime() - new Date(session.started_at).getTime()) / 1000;
  const restSeconds = Math.max(0, Math.ceil((deadline ? deadline - now : (paused ?? 0)) / 1000));
  return (
    <>
      <PageHeader
        title={session.title}
        subtitle={`${session.status.replaceAll("_", " ")} · ${new Date(session.started_at).toLocaleString()}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/workouts">Back to workouts</Link>
          </Button>
        }
      />
      <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <p>
          Session <strong className="tabular-nums">{fmtDuration(duration)}</strong> ·{" "}
          {exercises.reduce((s, e) => s + e.sets.length, 0)} sets ·{" "}
          {trainingVolume(
            exercises.flatMap((e) => (e.exercise.tracking_type === "time" ? [] : e.sets)),
          )}{" "}
          kg volume
        </p>
        {running && (
          <div className="flex items-center gap-3">
            <span aria-live="polite">Rest {fmtDuration(restSeconds)}</span>
            <Button
              variant="outline"
              onClick={toggleRest}
              disabled={deadline === null && paused === null}
            >
              {paused !== null ? "Resume rest" : "Pause rest"}
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-5">
        {exercises.map((e, i) => (
          <Panel id={`exercise-${e.id}`} key={e.id} title={`${i + 1}. ${e.exercise.name}`}>
            <p className="mb-3 text-sm text-muted-foreground">
              {e.target_sets} sets ×{" "}
              {e.exercise.tracking_type === "time"
                ? `${e.target_duration_seconds} seconds`
                : `${e.target_reps_min}–${e.target_reps_max} reps`}{" "}
              · {e.rest_seconds}s rest · {e.status}
            </p>
            <div className="mb-4">
              <ExerciseGuideTrigger name={e.exercise.name} instructions={e.exercise.instructions} />
            </div>
            <div className="mb-4 space-y-2">
              {e.sets.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-elevated p-3 text-sm"
                >
                  <span>
                    Set {s.set_number}:{" "}
                    {s.duration_seconds !== null
                      ? `${s.duration_seconds}s`
                      : `${s.repetitions} reps × ${s.weight_kg ?? 0} kg (${s.weight_basis.replaceAll("_", " ")})`}
                    {s.side ? ` · ${s.side}` : ""}
                  </span>
                  {running && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(s.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {running &&
              (e.status === "pending" || editing?.workout_session_exercise_id === e.id) && (
                <form
                  key={
                    editing?.workout_session_exercise_id === e.id
                      ? editing.id
                      : `new-${e.sets.length}`
                  }
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    save.mutate({ exercise: e, form: ev.currentTarget });
                  }}
                >
                  {e.exercise.tracking_type === "time" ? (
                    <NumberField
                      label="Duration (seconds)"
                      name="duration"
                      min={1}
                      max={86400}
                      step="1"
                      value={
                        editing?.workout_session_exercise_id === e.id
                          ? (editing.duration_seconds ?? 30)
                          : (e.target_duration_seconds ?? 30)
                      }
                    />
                  ) : (
                    <>
                      <NumberField
                        label="Actual repetitions"
                        name="reps"
                        min={1}
                        max={1000}
                        step="1"
                        value={
                          editing?.workout_session_exercise_id === e.id
                            ? (editing.repetitions ?? 10)
                            : (e.target_reps_min ?? 10)
                        }
                      />
                      <NumberField
                        label="Weight (kg)"
                        name="weight"
                        min={0}
                        max={999}
                        value={
                          editing?.workout_session_exercise_id === e.id
                            ? (editing.weight_kg ?? 0)
                            : (e.sets.at(-1)?.weight_kg ?? 0)
                        }
                      />
                      <Field label="Weight means">
                        <select
                          className={selectClass}
                          name="basis"
                          defaultValue={
                            editing?.workout_session_exercise_id === e.id
                              ? editing.weight_basis
                              : e.exercise.is_unilateral
                                ? "combined"
                                : "per_dumbbell"
                          }
                        >
                          <option value="per_dumbbell">Per dumbbell (two used)</option>
                          <option value="combined">Total load (or single dumbbell)</option>
                          <option value="bodyweight">Bodyweight</option>
                        </select>
                      </Field>
                    </>
                  )}
                  {e.exercise.is_unilateral && (
                    <Field label="Side">
                      <select
                        className={selectClass}
                        name="side"
                        defaultValue={
                          editing?.workout_session_exercise_id === e.id
                            ? (editing.side ?? "both")
                            : "both"
                        }
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="both">Both (total repetitions)</option>
                      </select>
                    </Field>
                  )}
                  <Button className="self-end" disabled={save.isPending}>
                    {editing?.workout_session_exercise_id === e.id ? "Update set" : "Complete set"}
                  </Button>
                </form>
              )}
            {running && (
              <div className="mt-4 flex flex-wrap gap-2">
                {i < exercises.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById("exercise-" + exercises[i + 1]!.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    Next exercise
                  </Button>
                )}
                {e.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={status.isPending || !e.sets.length}
                      onClick={() => status.mutate({ exercise: e.id, state: "completed" })}
                    >
                      Mark exercise complete
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={status.isPending}
                      onClick={() => status.mutate({ exercise: e.id, state: "skipped" })}
                    >
                      Skip exercise
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    disabled={status.isPending}
                    onClick={() => status.mutate({ exercise: e.id, state: "pending" })}
                  >
                    Reopen exercise
                  </Button>
                )}
                {editing?.workout_session_exercise_id === e.id && (
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    Cancel edit
                  </Button>
                )}
              </div>
            )}
          </Panel>
        ))}
      </div>
      {running && (
        <div className="mt-6 flex gap-3">
          <Button disabled={finish.isPending} onClick={() => setConfirm("completed")}>
            Finish workout
          </Button>
          <Button
            variant="outline"
            disabled={finish.isPending}
            onClick={() => setConfirm("cancelled")}
          >
            Cancel workout
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "completed" ? "Finish workout?" : "Cancel workout?"}
        body={
          confirm === "completed"
            ? "Your logged sets will be saved to workout history. Any unfinished exercises will remain visible in the record."
            : "The session will be marked cancelled. Your recorded sets will be retained."
        }
        confirmLabel={confirm === "completed" ? "Finish workout" : "Cancel workout"}
        destructive={confirm === "cancelled"}
        onConfirm={() => confirm && finish.mutate(confirm)}
      />
    </>
  );
}
