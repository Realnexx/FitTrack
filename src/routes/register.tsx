import { GoogleAuthButton } from "@/components/google-auth-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, FieldError } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common";

const schema = z
  .object({
    full_name: z.string().trim().min(1, "Enter your name").max(80),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — FitTrack" },
      {
        name: "description",
        content: "Create a free FitTrack account to start tracking your lean bulk.",
      },
      { property: "og:title", content: "Create account — FitTrack" },
      {
        property: "og:description",
        content: "Create a free FitTrack account to start tracking your lean bulk.",
      },
    ],
  }),
  component: Register,
});

function Register() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: v.full_name },
      },
    });
    if (error) {
      setError(
        /registered|exists/i.test(error.message)
          ? "An account with this email already exists. Try signing in."
          : error.message,
      );
      return;
    }
    // Supabase returns a user with no identities when the email is already taken.
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Try signing in.");
      return;
    }
    if (data.session) {
      window.location.assign("/onboarding");
      return;
    }
    setSentTo(v.email);
  });

  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>.
            Open it to activate your account, then sign in.
          </p>
        </div>
      </AuthCard>
    );
  }

  const field = (
    name: keyof z.infer<typeof schema>,
    label: string,
    type = "text",
    auto?: string,
  ) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        autoComplete={auto}
        className="mt-1.5 h-11"
        aria-invalid={!!formState.errors[name]}
        aria-describedby={`${name}-err`}
        {...register(name)}
      />
      <FieldError id={`${name}-err`} message={formState.errors[name]?.message} />
    </div>
  );

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start tracking weight, workouts and meals."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleAuthButton />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field("full_name", "Full name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("confirm", "Confirm password", "password", "new-password")}
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Spinner />} Create account
        </Button>
      </form>
    </AuthCard>
  );
}
