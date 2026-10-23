import { createFileRoute, Link } from "@tanstack/react-router";
import { useSessions } from "@/lib/data";
import { useDisplayDate } from "@/hooks/use-display-date";
import { PageHeader, Panel, LoadingBlock, ErrorBlock } from "@/components/common";
import { fmtDuration } from "@/lib/dates";
export const Route = createFileRoute("/_app/workouts/history")({ component: History });
function History() {
  const sessions = useSessions("1900-01-01");
  const display = useDisplayDate();
  if (sessions.isPending) return <LoadingBlock />;
  if (sessions.error)
    return <ErrorBlock error={sessions.error} retry={() => void sessions.refetch()} />;
  return (
    <>
      <PageHeader
        title="Workout history"
        subtitle={`${sessions.data?.length ?? 0} completed workouts`}
      />
      <Panel title="All completed sessions">
        <div className="space-y-3">
          {sessions.data?.map((s) => (
            <Link
              key={s.id}
              to="/workouts/history/$id"
              params={{ id: s.id }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 hover:bg-elevated"
            >
              <strong>{s.title}</strong>
              <span className="text-sm text-muted-foreground">
                {display(s.started_at)} ·{" "}
                {fmtDuration(
                  (new Date(s.ended_at ?? s.started_at).getTime() -
                    new Date(s.started_at).getTime()) /
                    1000,
                )}
              </span>
            </Link>
          ))}
          {!sessions.data?.length && (
            <p className="text-sm text-muted-foreground">
              Complete your first workout to begin your history.
            </p>
          )}
        </div>
      </Panel>
    </>
  );
}
