import { ResponsiveModal } from "@/components/responsive-modal";
import { useId, useState } from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Dumbbell, Settings2, ArrowUpRight } from "lucide-react";
import { ModalActionBar, ModalFormActions } from "@/components/modal-actions";
import { supabase } from "@/integrations/supabase/client";
import { usePlan, useExercises, useAction, unwrap, uid, qk, type PlanExercise } from "@/lib/data";
import { LoadingBlock, ErrorBlock } from "@/components/common";
import { Field, NumberField, selectClass, values } from "@/components/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function PlanEditor({
  id,
  close,
  embedded = false,
}: {
  id: string;
  close: () => void;
  embedded?: boolean;
}) {
  const formId = useId();
  const targetFormId = useId();
  const addFormId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newExerciseId, setNewExerciseId] = useState("");
  const plan = usePlan(id);
  const library = useExercises();
  const save = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      unwrap(
        await supabase
          .from("workout_plans")
          .update({ name: v.text("name"), description: v.text("description") })
          .eq("id", id),
      );
    },
    {
      invalidate: [qk.plans, qk.plan(id)],
      success: "Plan updated",
      onSuccess: () => setDirty(false),
    },
  );
  const add = useAction(
    async (form: HTMLFormElement) => {
      const v = values(form);
      const exercise = library.data?.find((e) => e.id === v.text("exercise"));
      if (!exercise) throw new Error("Choose an exercise from the library.");
      unwrap(
        await supabase.from("workout_plan_exercises").insert({
          user_id: await uid(),
          workout_plan_id: id,
          exercise_id: v.text("exercise"),
          exercise_order:
            Math.max(-1, ...(plan.data?.items.map((i) => i.exercise_order) ?? [])) + 1,
          target_sets: v.num("sets"),
          target_reps_min: exercise?.tracking_type === "time" ? null : v.num("reps"),
          target_reps_max: exercise?.tracking_type === "time" ? null : v.num("reps"),
          target_duration_seconds: exercise?.tracking_type === "time" ? v.num("duration") : null,
          rest_seconds: v.num("rest"),
        }),
      );
    },
    {
      invalidate: [qk.plan(id), qk.plans],
      success: "Exercise added",
      onSuccess: () => setAddOpen(false),
    },
  );
  const edit = useAction(
    async ({ item, form }: { item: PlanExercise; form: HTMLFormElement }) => {
      const v = values(form);
      unwrap(
        await supabase
          .from("workout_plan_exercises")
          .update({
            target_sets: v.num("sets"),
            target_reps_min: item.exercise.tracking_type === "time" ? null : v.num("reps"),
            target_reps_max: item.exercise.tracking_type === "time" ? null : v.num("reps"),
            target_duration_seconds:
              item.exercise.tracking_type === "time" ? v.num("duration") : null,
            rest_seconds: v.num("rest"),
          })
          .eq("id", item.id),
      );
    },
    {
      invalidate: [qk.plan(id)],
      success: "Exercise targets updated",
      onSuccess: () => setEditingId(null),
    },
  );
  const remove = useAction(
    async (item: string) =>
      unwrap(await supabase.from("workout_plan_exercises").delete().eq("id", item)),
    { invalidate: [qk.plan(id), qk.plans], success: "Exercise removed" },
  );
  const move = useAction(
    async ({ item, index }: { item: PlanExercise; index: number }) => {
      const items = plan.data?.items ?? [];
      const other = items[index];
      if (!other) return;
      unwrap(
        await supabase.rpc("reorder_plan_exercises", { first_id: item.id, second_id: other.id }),
      );
    },
    { invalidate: [qk.plan(id)] },
  );
  if (plan.isPending || library.isPending) return <LoadingBlock />;
  if (plan.error || library.error) return <ErrorBlock error={plan.error || library.error} />;
  if (!plan.data) return <p>Plan not found.</p>;
  const chosen = library.data?.find((e) => e.id === newExerciseId) ?? library.data?.[0];
  const selected = plan.data.items.find((item) => item.id === editingId);
  const busy =
    save.isPending || add.isPending || edit.isPending || remove.isPending || move.isPending;
  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Edit workout plan</h2>
          <Button type="button" variant="outline" onClick={close}>
            Close
          </Button>
        </div>
      )}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Settings2 className="size-4 text-primary" />
          Plan details
        </h3>
        <form
          id={formId}
          key={id}
          className="space-y-4"
          onChange={() => setDirty(true)}
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate(event.currentTarget);
          }}
        >
          <Field label="Plan name">
            <Input
              name="name"
              required
              maxLength={100}
              defaultValue={plan.data.plan.name}
              disabled={save.isPending}
              className="h-11 rounded-xl bg-elevated/30"
            />
          </Field>
          <Field label="Description">
            <Input
              name="description"
              maxLength={300}
              defaultValue={plan.data.plan.description ?? ""}
              disabled={save.isPending}
              className="h-11 rounded-xl bg-elevated/30"
            />
          </Field>
        </form>
      </section>
      <section className="border-t pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Exercises & targets</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Open an exercise to adjust its targets.
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            {plan.data.items.length} exercises
          </span>
        </div>
        <div className="space-y-2">
          {plan.data.items.map((item, i) => (
            <article key={item.id} className="rounded-2xl border bg-card">
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditingId(item.id)}
                aria-label={`Edit targets for ${item.exercise.name}`}
                className="flex w-full items-center gap-3 rounded-t-2xl p-4 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.exercise.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.target_sets} sets ·{" "}
                    {item.exercise.tracking_type === "time"
                      ? `${item.target_duration_seconds}s`
                      : `${item.target_reps_min}–${item.target_reps_max} reps`}{" "}
                    · {item.rest_seconds}s rest
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-primary" />
              </button>
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Order saves immediately</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Move ${item.exercise.name} up`}
                    disabled={i === 0 || busy}
                    onClick={() => move.mutate({ item, index: i - 1 })}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Move ${item.exercise.name} down`}
                    disabled={i === plan.data!.items.length - 1 || busy}
                    onClick={() => move.mutate({ item, index: i + 1 })}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${item.exercise.name}`}
                    disabled={busy}
                    onClick={() => remove.mutate(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!plan.data.items.length && (
          <div className="rounded-xl border border-dashed p-5 text-center">
            <Dumbbell className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              Add your first exercise to build this routine.
            </p>
          </div>
        )}
        <Button
          type="button"
          variant="tonal"
          className="mt-3 h-12 w-full border-primary/40"
          disabled={busy}
          onClick={() => setAddOpen(true)}
        >
          <Plus />
          Add an exercise
        </Button>
      </section>
      <ResponsiveModal
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open && !edit.isPending) setEditingId(null);
        }}
        title={selected ? `Edit ${selected.exercise.name}` : "Exercise targets"}
        description="Set the amount of work and recovery for this movement."
      >
        {selected && (
          <>
            <form
              id={targetFormId}
              key={selected.id}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!edit.isPending) edit.mutate({ item: selected, form: event.currentTarget });
              }}
            >
              <div className="rounded-xl border bg-primary/5 p-4 text-sm">
                <p className="font-semibold">{selected.exercise.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Changes apply to future workouts. Existing session targets remain unchanged.
                </p>
              </div>
              <fieldset disabled={edit.isPending} className="grid grid-cols-2 gap-4">
                <TargetFields
                  timed={selected.exercise.tracking_type === "time"}
                  sets={selected.target_sets}
                  reps={selected.target_reps_min ?? 10}
                  duration={selected.target_duration_seconds ?? 30}
                  rest={selected.rest_seconds}
                />
              </fieldset>
            </form>
            <ModalActionBar>
              <ModalFormActions
                form={targetFormId}
                onCancel={() => setEditingId(null)}
                pending={edit.isPending}
                label="Save targets"
                pendingLabel="Saving targets…"
                hint="Save these targets to your workout plan."
              />
            </ModalActionBar>
          </>
        )}
      </ResponsiveModal>
      <ResponsiveModal
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && !add.isPending) setAddOpen(false);
        }}
        title="Add an exercise"
        description="Choose a movement and configure its training targets."
      >
        {addOpen && (
          <>
            <form
              id={addFormId}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!add.isPending) add.mutate(event.currentTarget);
              }}
            >
              <Field label="Exercise">
                <select
                  name="exercise"
                  className={selectClass}
                  required
                  disabled={add.isPending}
                  value={chosen?.id ?? ""}
                  onChange={(event) => setNewExerciseId(event.target.value)}
                >
                  {!library.data?.length && <option value="">No exercises available</option>}
                  {library.data?.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </Field>
              <fieldset disabled={add.isPending} className="grid grid-cols-2 gap-4">
                <TargetFields
                  key={chosen?.tracking_type}
                  timed={chosen?.tracking_type === "time"}
                  sets={3}
                  reps={10}
                  duration={30}
                  rest={90}
                />
              </fieldset>
            </form>
            <ModalActionBar>
              <ModalFormActions
                form={addFormId}
                onCancel={() => setAddOpen(false)}
                pending={add.isPending}
                disabled={!chosen}
                label="Add to workout"
                pendingLabel="Adding exercise…"
                hint="The exercise is added after the current movements."
              />
            </ModalActionBar>
          </>
        )}
      </ResponsiveModal>
      <ModalActionBar>
        <ModalFormActions
          form={formId}
          onCancel={close}
          pending={save.isPending}
          disabled={!dirty || busy}
          saved={Boolean(save.isSuccess) && !dirty}
          label="Save plan"
          hint={dirty ? "Unsaved plan details" : "Plan details are up to date"}
        />
      </ModalActionBar>
    </div>
  );
}
function TargetFields({
  timed,
  sets,
  reps,
  duration,
  rest,
}: {
  timed: boolean;
  sets: number;
  reps: number;
  duration: number;
  rest: number;
}) {
  return (
    <>
      <NumberField label="Sets" name="sets" min={1} max={20} step="1" value={sets} />
      {timed ? (
        <NumberField
          label="Duration (sec)"
          name="duration"
          min={1}
          max={3600}
          step="1"
          value={duration}
        />
      ) : (
        <NumberField label="Target reps" name="reps" min={1} max={200} step="1" value={reps} />
      )}
      <NumberField label="Rest (sec)" name="rest" min={0} max={900} step="1" value={rest} />
    </>
  );
}
