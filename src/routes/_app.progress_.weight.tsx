import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/progress_/weight")({
  beforeLoad: () => {
    throw redirect({ to: "/progress" });
  },
});
