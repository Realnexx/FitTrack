import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAction, unwrap, uid } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ErrorBlock } from "@/components/common";
export function DeleteAccountRequest() {
  const [confirm, setConfirm] = useState(false);
  const request = useQuery({
    queryKey: ["accountDeletion"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("account_deletion_requests")
          .select("*")
          .eq("user_id", await uid())
          .maybeSingle(),
      ),
  });
  const submit = useAction(
    async (status: string) =>
      unwrap(
        await supabase
          .from("account_deletion_requests")
          .upsert(
            { user_id: await uid(), status, requested_at: new Date().toISOString() },
            { onConflict: "user_id" },
          ),
      ),
    {
      invalidate: [["accountDeletion"]],
      success: "Account deletion request updated",
      onSuccess: () => setConfirm(false),
    },
  );
  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="font-medium">Account deletion</h3>
      <p className="my-2 text-sm text-muted-foreground">
        Request permanent removal of your account and fitness records. A trusted operator must
        fulfill the request; your data remains until then. You can cancel a pending request.
      </p>
      {request.error ? (
        <ErrorBlock error={request.error} retry={() => void request.refetch()} />
      ) : request.isPending ? (
        <p className="text-sm text-muted-foreground">Loading request status…</p>
      ) : request.data?.status === "pending" ? (
        <>
          <p role="status" className="mb-3 text-sm">
            Deletion request pending since{" "}
            {new Date(request.data.requested_at).toLocaleDateString()}.
          </p>
          <Button
            variant="outline"
            disabled={submit.isPending}
            onClick={() => submit.mutate("cancelled")}
          >
            Cancel deletion request
          </Button>
        </>
      ) : (
        <Button variant="outline" disabled={submit.isPending} onClick={() => setConfirm(true)}>
          Request account deletion
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Request account deletion?"
        body="This queues a request for a trusted operator to permanently delete your account and all associated fitness data. You can cancel the request before it is fulfilled."
        confirmLabel="Submit deletion request"
        onConfirm={() => submit.mutate("pending")}
      />
    </div>
  );
}
