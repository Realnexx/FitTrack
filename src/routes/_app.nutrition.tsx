import { createFileRoute } from "@tanstack/react-router";
import { Nutrition } from "@/features/nutrition/Nutrition";
export const Route = createFileRoute("/_app/nutrition")({ component: Nutrition });
