import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/nutrition_/log")({
  beforeLoad: () => {
    throw redirect({ to: "/nutrition" });
  },
});
