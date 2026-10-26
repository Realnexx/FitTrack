import { useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import type { Schedule } from "@/lib/data";
import { DAY_NAMES } from "@/lib/dates";
import { Field, selectClass } from "@/components/fields";
import { Button } from "@/components/ui/button";
export function ScheduleEditor({
  formId,
  plans,
  rows,
  pending,
  onSave,
  onRemove,
}: {
  formId: string;
  plans: { id: string; name: string }[];
  rows: Schedule[];
  pending: boolean;
  onSave: (form: HTMLFormElement) => void;
  onRemove: (id: string) => void;
}) {
  const [day, setDay] = useState(1);
  const [parity, setParity] = useState("all");
  const [plan, setPlan] = useState(plans[0]?.id ?? "");
  const matching = rows.filter((row) => row.day_of_week === day);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-primary/5 p-4">
        <div className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-primary" />
          Your weekly routine
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Choose a day to add or replace its routine. Every week replaces both alternating weeks;
          changing odd or even weeks keeps the other week.
        </p>
      </div>
      <div
        className="grid grid-cols-4 gap-2 sm:grid-cols-7"
        role="group"
        aria-label="Training days"
      >
        {[1, 2, 3, 4, 5, 6, 0].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={day === value}
            disabled={pending}
            onClick={() => setDay(value)}
            className={`min-h-20 rounded-xl border p-2 text-center transition-colors ${day === value ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-accent"}`}
          >
            <span className="block text-sm font-semibold">{DAY_NAMES[value]}</span>
            <span className="mt-2 block text-[10px] text-muted-foreground">
              {rows.some((row) => row.day_of_week === value) ? "Training" : "Rest"}
            </span>
          </button>
        ))}
      </div>
      <section>
        <h3 className="text-sm font-semibold">Saved for {DAY_NAMES[day]}</h3>
        <div className="mt-3 space-y-2">
          {matching.length ? (
            matching.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {plans.find((p) => p.id === row.workout_plan_id)?.name ?? "Workout plan"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.week_parity === "all"
                      ? "Every week"
                      : `${row.week_parity === "odd" ? "Odd" : "Even"} ISO weeks`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${DAY_NAMES[day]} ${row.week_parity} schedule`}
                  disabled={pending}
                  onClick={() => onRemove(row.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Rest day. Add a routine below when you’re ready.
            </p>
          )}
        </div>
      </section>
      <form
        id={formId}
        className="space-y-4 rounded-2xl border bg-elevated/10 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending) onSave(event.currentTarget);
        }}
      >
        <h3 className="text-sm font-semibold">Assign a routine</h3>
        <fieldset disabled={pending || !plans.length} className="grid gap-4 sm:grid-cols-2">
          <Field label="Day">
            <select
              name="day"
              className={selectClass}
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
            >
              {DAY_NAMES.map((name, value) => (
                <option value={value} key={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan">
            <select
              required
              name="plan"
              className={selectClass}
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            >
              {!plans.length && <option value="">Create a plan first</option>}
              {plans.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Week">
            <select
              name="parity"
              className={selectClass}
              value={parity}
              onChange={(event) => setParity(event.target.value)}
            >
              <option value="all">Every week</option>
              <option value="odd">Odd ISO weeks</option>
              <option value="even">Even ISO weeks</option>
            </select>
          </Field>
        </fieldset>
        <p className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
          Save {plans.find((p) => p.id === plan)?.name ?? "a routine"} on {DAY_NAMES[day]},{" "}
          {parity === "all" ? "every week" : `${parity} ISO weeks`}.{" "}
          {matching.length
            ? "Any overlapping assignment will be replaced."
            : "This will add a new scheduled day."}
        </p>
      </form>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Odd and even refer to the ISO week number, not alternate dates. Unsaved selections do not
        change your routine.
      </p>
    </div>
  );
}
