import { signInError } from "@/lib/auth-errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, FieldError } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — FitTrack" },
      { name: "description", content: "Sign in to FitTrack to log workouts, meals and weight." },
      { property: "og:title", content: "Sign in — FitTrack" },
      {
        property: "og:description",
        content: "Sign in to FitTrack to log workouts, meals and weight.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword(v);
    if (error) {
      setError(signInError(error));
      return;
    }
    const result = await supabase.from("user_settings").select("default_landing").maybeSingle();
    const landing = result.data?.default_landing;
    const to =
      landing === "/workouts" || landing === "/nutrition" || landing === "/progress"
        ? landing
        : "/dashboard";
    await navigate({ to, replace: true });
  });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue your progress."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 h-11"
            aria-invalid={!!formState.errors.email}
            aria-describedby="email-err"
            {...register("email")}
          />
          <FieldError id="email-err" message={formState.errors.email?.message} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1.5 h-11"
            aria-invalid={!!formState.errors.password}
            aria-describedby="pw-err"
            {...register("password")}
          />
          <FieldError id="pw-err" message={formState.errors.password?.message} />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Spinner />} Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
