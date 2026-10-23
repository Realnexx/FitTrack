import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getExerciseGuide } from "@/lib/exercise-guides";
import { Panel } from "@/components/common";
import type { Exercise } from "@/lib/data";
function ExerciseImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="grid aspect-[4/3] place-items-center rounded-lg bg-elevated p-3 text-center text-xs text-muted-foreground">
      Exercise image unavailable
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={360}
      height={270}
      onError={() => setFailed(true)}
      className={className ?? "aspect-[4/3] w-full rounded-lg bg-elevated object-contain"}
    />
  );
}
export function ExerciseInstructions({
  name,
  instructions,
}: {
  name: string;
  instructions: string | null;
}) {
  const guide = getExerciseGuide(name);
  if (!guide)
    return (
      <p className="mt-3 text-sm leading-relaxed">
        {instructions || "Instructions have not been added for this exercise yet."}
      </p>
    );
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {guide.captions.map((caption, i) => (
          <figure key={caption}>
            <ExerciseImage
              src={`/exercises/${guide.slug}-${i}.${guide.extension}`}
              alt={`${name}: ${caption.toLowerCase()}`}
            />
            <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {i + 1}. {caption}
            </figcaption>
          </figure>
        ))}
      </div>
      {guide.note && <p className="text-xs text-muted-foreground">{guide.note}</p>}
      <div>
        <h4 className="mb-3 text-sm font-semibold">How to do it</h4>
        <ol className="space-y-3">
          {guide.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed">
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                aria-hidden
              >
                {i + 1}
              </span>
              <span>
                <span className="sr-only">Step {i + 1}: </span>
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="rounded-lg bg-elevated p-3 text-sm leading-relaxed">
        <strong className="text-primary">Form cue: </strong>
        {guide.cue}
      </p>
    </div>
  );
}
export function ExerciseGuideTrigger({
  name,
  instructions,
}: {
  name: string;
  instructions: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`View guide for ${name}`}
      >
        Images & instructions
        <ArrowUpRight className="size-3.5" />
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={name}
        description="Movement images, step-by-step instructions and form cues."
      >
        <ExerciseInstructions name={name} instructions={instructions} />
      </ResponsiveModal>
    </>
  );
}
export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [query, setQuery] = useState("");
  const filtered = exercises.filter((e) =>
    `${e.name} ${e.primary_muscle_group} ${e.equipment}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <Panel
      title="Explore the exercise library"
      action={<span className="text-xs text-muted-foreground">{exercises.length} movements</span>}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Find your next movement. Open a guide to learn the technique.
      </p>
      <div className="relative mb-5">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exercise library"
          placeholder="Search exercises or muscle groups…"
          className="pl-9"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
        {filtered.map((e) => {
          const guide = getExerciseGuide(e.name);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e)}
              className="group overflow-hidden rounded-xl border bg-background/30 text-left transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`View guide for ${e.name}`}
            >
              <div className="relative overflow-hidden border-b bg-elevated">
                {guide ? (
                  <ExerciseImage
                    src={`/exercises/${guide.slug}-0.${guide.extension}`}
                    alt={`${e.name} demonstration`}
                    className="aspect-[16/10] w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center text-sm text-muted-foreground">
                    Written guide
                  </div>
                )}
                <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {e.primary_muscle_group}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold">{e.name}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {e.equipment} · {e.suggested_sets} × {e.suggested_reps}
                </p>
                <span className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-medium text-primary">
                  View movement guide
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {!filtered.length && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No exercises match “{query}”. Try a movement or muscle group.
        </p>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Photos:{" "}
        <a
          href="https://github.com/yuhonas/free-exercise-db"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Free Exercise DB
        </a>{" "}
        · diagrams: FitTrack.
      </p>
      <ResponsiveModal
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.name ?? "Exercise guide"}
        description={
          selected
            ? `${selected.primary_muscle_group} · ${selected.equipment} · ${selected.suggested_sets} × ${selected.suggested_reps}`
            : "Movement instructions"
        }
      >
        {selected && (
          <ExerciseInstructions name={selected.name} instructions={selected.instructions} />
        )}
      </ResponsiveModal>
    </Panel>
  );
}
