import { createFileRoute } from "@tanstack/react-router";
import { WorkoutSession } from "@/features/workouts/WorkoutSession";
export const Route = createFileRoute("/_app/workouts/session/$id")({
  component: () => <WorkoutSession id={Route.useParams().id} />,
});
