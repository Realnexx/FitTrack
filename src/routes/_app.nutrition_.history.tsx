import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/nutrition_/history")({
  beforeLoad: () => {
    throw redirect({ to: "/nutrition" });
  },
});
