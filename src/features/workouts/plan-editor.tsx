import { useId, useState } from "react";
import {
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Dumbbell,
  Loader2,
  Settings2,
  ChevronDown,
} from "lucide-react";
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
    { invalidate: [qk.plan(id), qk.plans], success: "Exercise added" },
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
    { invalidate: [qk.plan(id)], success: "Exercise targets updated" },
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
  const busy =
    save.isPending || add.isPending || edit.isPending || remove.isPending || move.isPending;
  return (
    <div className="space-y-7">
      {!embedded && (
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Edit workout plan</h2>
          <Button type="button" variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      )}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Plan details</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Give your routine a clear name and focus.
            </p>
          </div>
        </div>
        <form
          id={formId}
          key={id}
          className="space-y-4"
          onChange={() => setDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(e.currentTarget);
          }}
        >
          <Field label="Plan name">
            <Input
              name="name"
              required
              maxLength={100}
              defaultValue={plan.data.plan.name}
              placeholder="e.g. Full body strength"
              disabled={save.isPending}
              className="h-11 rounded-xl bg-elevated/30"
            />
          </Field>
          <Field label="Description">
            <Input
              name="description"
              defaultValue={plan.data.plan.description ?? ""}
              placeholder="A short note about this workout"
              disabled={save.isPending}
              className="h-11 rounded-xl bg-elevated/30"
            />
          </Field>
        </form>
      </section>
      <section className="border-t pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Exercises & targets</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Save targets on each exercise. Order changes save immediately.
            </p>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            {plan.data.items.length} exercises
          </span>
        </div>
        <div className="space-y-3">
          {plan.data.items.map((item, i) => (
            <details
              key={item.id}
              className="group overflow-hidden rounded-xl border bg-elevated/15"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.exercise.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.target_sets} sets ·{" "}
                    {item.exercise.tracking_type === "time"
                      ? `${item.target_duration_seconds}s`
                      : `${item.target_reps_min}–${item.target_reps_max} reps`}{" "}
                    · {item.rest_seconds}s rest
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t p-4">
                <form
                  className="grid grid-cols-2 gap-4 sm:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    edit.mutate({ item, form: e.currentTarget });
                  }}
                >
                  <NumberField
                    label="Sets"
                    name="sets"
                    min={1}
                    max={20}
                    step="1"
                    value={item.target_sets}
                  />
                  {item.exercise.tracking_type === "time" ? (
                    <NumberField
                      label="Duration (sec)"
                      name="duration"
                      min={1}
                      max={3600}
                      step="1"
                      value={item.target_duration_seconds ?? 30}
                    />
                  ) : (
                    <NumberField
                      label="Target reps"
                      name="reps"
                      min={1}
                      max={200}
                      step="1"
                      value={item.target_reps_min ?? 10}
                    />
                  )}
                  <NumberField
                    label="Rest (sec)"
                    name="rest"
                    min={0}
                    max={900}
                    step="1"
                    value={item.rest_seconds}
                  />
                  <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t pt-4 sm:col-span-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-lg"
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
                        className="size-9 rounded-lg"
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
                        className="size-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.exercise.name}`}
                        disabled={busy}
                        onClick={() => remove.mutate(item.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Button variant="secondary" disabled={busy} className="h-10 rounded-xl">
                      {edit.isPending && edit.variables?.item.id === item.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                      {edit.isPending && edit.variables?.item.id === item.id
                        ? "Saving…"
                        : "Save targets"}
                    </Button>
                  </div>
                </form>
              </div>
            </details>
          ))}
        </div>
        {!plan.data.items.length && (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Dumbbell className="mx-auto mb-3 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Make room for your first exercise</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a movement below to start building your routine.
            </p>
          </div>
        )}
      </section>
      <details className="group rounded-xl border border-dashed bg-primary/[0.03]">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-4" />
          </span>
          <span className="flex-1 text-sm font-semibold">Add an exercise</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <form
          className="grid gap-4 border-t p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate(e.currentTarget);
          }}
        >
          <Field label="Exercise">
            <select
              name="exercise"
              className={selectClass}
              required
              value={chosen?.id ?? ""}
              onChange={(e) => setNewExerciseId(e.target.value)}
            >
              {library.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <NumberField label="Sets" name="sets" value={3} min={1} max={20} step="1" />
          {chosen?.tracking_type === "time" ? (
            <NumberField
              label="Duration (sec)"
              name="duration"
              value={30}
              min={1}
              max={3600}
              step="1"
            />
          ) : (
            <NumberField
              label="Target repetitions"
              name="reps"
              value={10}
              min={1}
              max={200}
              step="1"
            />
          )}
          <NumberField label="Rest seconds" name="rest" value={90} min={0} max={900} step="1" />
          <Button disabled={busy || !chosen} className="h-11 rounded-xl sm:col-span-2">
            {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            {add.isPending ? "Adding exercise…" : "Add to workout"}
          </Button>
        </form>
      </details>
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
