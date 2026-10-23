import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/nutrition_/foods")({
  beforeLoad: () => {
    throw redirect({ to: "/nutrition" });
  },
});
