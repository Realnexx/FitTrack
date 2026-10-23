import { createFileRoute } from "@tanstack/react-router";
import { Workouts } from "@/features/workouts/Workouts";
export const Route = createFileRoute("/_app/workouts/")({ component: Workouts });
