import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Dumbbell, LineChart, Utensils } from "lucide-react";
import { Logo } from "@/components/auth-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitTrack — Lean bulk, workouts & nutrition tracker" },
      {
        name: "description",
        content:
          "Track body weight, dumbbell workouts, calories and protein — built for gaining weight and muscle.",
      },
      { property: "og:title", content: "FitTrack — Lean bulk, workouts & nutrition tracker" },
      {
        property: "og:description",
        content:
          "Track body weight, dumbbell workouts, calories and protein — built for gaining weight and muscle.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Activity,
    title: "Weight progress",
    body: "Log weigh-ins and see real progress toward your target.",
  },
  {
    icon: Dumbbell,
    title: "Dumbbell workouts",
    body: "Ready-made A/B plans, set logging and a rest timer.",
  },
  {
    icon: Utensils,
    title: "Filipino foods",
    body: "Rice, adobo, monggo and more with calories and protein.",
  },
  {
    icon: LineChart,
    title: "Honest reports",
    body: "Charts built only from what you actually logged.",
  },
];

function Landing() {
  return (
    <div className="bg-hero min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 md:pt-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Lean bulk, simplified
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Gain weight. Build muscle. <span className="text-primary">See it happen.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          FitTrack brings your weigh-ins, home dumbbell workouts and daily meals into one dashboard
          so you always know where you stand.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="shadow-glow">
            <Link to="/register">Create free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I have an account</Link>
          </Button>
        </div>
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <li key={f.title} className="rounded-2xl border bg-card/80 p-5 shadow-card">
              <f.icon className="size-6 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
