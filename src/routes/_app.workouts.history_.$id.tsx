import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ResponsiveModal } from "@/components/responsive-modal";
import { WorkoutHistoryDetails } from "@/features/workouts/workout-details";
import { PageHeader } from "@/components/common";
export const Route = createFileRoute("/_app/workouts/history_/$id")({ component: HistoryDetail });
function HistoryDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Workout history" />
      <ResponsiveModal
        open
        onOpenChange={(o) => !o && navigate({ to: "/workouts/history" })}
        title="Workout summary"
        description="Review your recorded exercises, sets and training volume."
      >
        <WorkoutHistoryDetails id={id} />
      </ResponsiveModal>
    </>
  );
}
