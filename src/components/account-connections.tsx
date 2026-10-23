import { connectionError } from "@/lib/connection-error";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAction, unwrap, uid, qk } from "@/lib/data";
import { socialPlatforms, socialLinksFromForm } from "@/lib/profile-media";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field } from "./fields";
import { Loader2, Check, Link2, ExternalLink } from "lucide-react";
import { ModalActionBar, ModalFormActions } from "./modal-actions";
import { useId } from "react";
export function AccountConnections({
  userId,
  links,
  onClose,
}: {
  userId: string;
  links: unknown;
  onClose: () => void;
}) {
  const id = useId();
  const [connecting, setConnecting] = useState("");
  const [error, setError] = useState("");
  const identities = useQuery({
    queryKey: ["account-identities", userId],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      return data.identities;
    },
  });
  const values = links && typeof links === "object" ? (links as Record<string, string>) : {};
  const save = useAction(
    async (form: HTMLFormElement) => {
      const social_links = socialLinksFromForm(form);
      unwrap(
        await supabase
          .from("profiles")
          .update({ social_links })
          .eq("id", await uid()),
      );
    },
    { invalidate: [qk.profile], success: "Social profile links saved", onSuccess: onClose },
  );
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold">Connected sign-in accounts</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Connect a provider while signed in to use it with this FitTrack account.
        </p>
        <div className="mt-4 space-y-3">
          {(
            [
              ["google", "Google"],
              ["github", "GitHub"],
              ["facebook", "Facebook"],
            ] as const
          ).map(([provider, label]) => {
            const connected = identities.data?.some((identity) => identity.provider === provider);
            return (
              <div
                key={provider}
                className="flex items-center justify-between gap-3 rounded-xl border bg-elevated/15 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Link2 className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {connected ? (
                  <span className="flex items-center gap-1.5 text-xs text-primary">
                    <Check className="size-4" />
                    Connected
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={
                      Boolean(connecting) || identities.isPending || Boolean(identities.error)
                    }
                    onClick={async () => {
                      setError("");
                      setConnecting(provider);
                      try {
                        const { error } = await supabase.auth.linkIdentity({
                          provider,
                          options: {
                            redirectTo: `${window.location.origin}/auth/callback?next=settings`,
                          },
                        });
                        if (error) throw error;
                      } catch (failure) {
                        setConnecting("");
                        setError(connectionError(failure, label));
                      }
                    }}
                  >
                    {connecting === provider ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ExternalLink className="size-3.5" />
                    )}
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {identities.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not load connected accounts.{" "}
            <button type="button" className="underline" onClick={() => void identities.refetch()}>
              Retry
            </button>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      <section className="border-t pt-5">
        <h3 className="text-sm font-semibold">Social profile links</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Save links to your social profiles. These links do not connect sign-in accounts.
        </p>
        <form
          id={id}
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(event.currentTarget);
          }}
        >
          {socialPlatforms.map((platform) => (
            <Field key={platform.key} label={`${platform.label} profile URL`}>
              <Input
                name={platform.key}
                type="url"
                defaultValue={values[platform.key] ?? ""}
                placeholder={`https://${platform.hosts[0]}/...`}
                className="h-11 rounded-xl"
              />
            </Field>
          ))}
        </form>
      </section>
      <ModalActionBar>
        <ModalFormActions
          form={id}
          onCancel={onClose}
          pending={save.isPending}
          label="Save social links"
          hint="Sign-in connections save separately."
        />
      </ModalActionBar>
    </div>
  );
}

