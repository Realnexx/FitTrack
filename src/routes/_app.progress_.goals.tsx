import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/progress_/goals")({
  beforeLoad: () => {
    throw redirect({ to: "/progress" });
  },
});
