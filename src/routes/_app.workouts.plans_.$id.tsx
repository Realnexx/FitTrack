import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlanEditor } from "@/features/workouts/plan-editor";
import { ResponsiveModal } from "@/components/responsive-modal";
import { PageHeader } from "@/components/common";
export const Route = createFileRoute("/_app/workouts/plans_/$id")({ component: PlanPage });
function PlanPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const close = () => {
    void navigate({ to: "/workouts" });
  };
  return (
    <>
      <PageHeader title="Workout plans" subtitle="Make your routine work for you." />
      <ResponsiveModal
        open
        onOpenChange={(o) => !o && close()}
        title="Edit workout plan"
        description="Adjust your exercises, order and training targets."
      >
        <PlanEditor id={id} close={close} embedded />
      </ResponsiveModal>
    </>
  );
}
