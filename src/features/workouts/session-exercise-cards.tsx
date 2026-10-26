import { Check, ChevronRight, Dumbbell } from "lucide-react";
import type { SessionExercise } from "@/lib/data";
export function SessionExerciseCards({
  exercises,
  onOpen,
}: {
  exercises: SessionExercise[];
  onOpen: (id: string) => void;
}) {
  const completed = exercises.filter((e) => e.status === "completed").length;
  const total = exercises.reduce((sum, e) => sum + e.target_sets, 0);
  const saved = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const percent = exercises.length ? Math.round((completed / exercises.length) * 100) : 0;
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-5 rounded-3xl border bg-card p-5 sm:p-6">
        <div
          className="relative size-20 shrink-0"
          role="img"
          aria-label={`${completed} of ${exercises.length} exercises complete`}
        >
          <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r="33" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="33"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeDasharray="207.35"
              strokeDashoffset={207.35 * (1 - percent / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-xl font-semibold">
            {percent}%
          </span>
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Your session roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completed} of {exercises.length} exercises complete · {saved} sets saved
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {total} planned sets. Open an exercise to record your next set.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {exercises.map((e, i) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onOpen(e.id)}
            className="group rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${e.exercise.name}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${e.status === "completed" ? "bg-primary/15 text-primary" : "bg-elevated text-muted-foreground"}`}
              >
                {e.status === "completed" ? (
                  <Check className="size-5" />
                ) : (
                  <Dumbbell className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Exercise {String(i + 1).padStart(2, "0")}
                </span>
                <span className="block font-semibold">{e.exercise.name}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {e.target_sets} sets ×{" "}
              {e.exercise.tracking_type === "time"
                ? `${e.target_duration_seconds ?? 30}s`
                : `${e.target_reps_min ?? 8}–${e.target_reps_max ?? 12} reps`}{" "}
              · {e.status}
            </p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: Math.min(20, e.target_sets) }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${index < e.sets.length ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {e.sets.length} / {e.target_sets} sets recorded
            </p>
          </button>
        ))}
      </div>
      {!exercises.length && (
        <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
          No exercises in this session.
        </p>
      )}
    </section>
  );
}
