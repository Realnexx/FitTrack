import { useRef } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAction, uid, unwrap, qk } from "@/lib/data";
import { avatarFileError, ownedAvatarPath } from "@/lib/profile-media";
import { UserAvatar } from "./user-avatar";
import { Button } from "./ui/button";
export function ProfilePhotoEditor({
  name,
  photo,
  customPhoto,
}: {
  name: string;
  photo: string | null;
  customPhoto?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const action = useAction(
    async (file: File | null) => {
      const userId = await uid();
      let path: string | null = null;
      let url: string | null = null;
      if (file) {
        const problem = avatarFileError(file);
        if (problem) throw new Error(problem);
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        path = `${userId}/${crypto.randomUUID()}.${ext}`;
        unwrap(
          await supabase.storage
            .from("avatars")
            .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false }),
        );
        url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      try {
        unwrap(await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId));
      } catch (error) {
        if (path)
          await supabase.storage
            .from("avatars")
            .remove([path])
            .catch(() => undefined);
        throw error;
      }
      const base =
        url ?? supabase.storage.from("avatars").getPublicUrl("placeholder").data.publicUrl;
      const previous = ownedAvatarPath(customPhoto, userId, base);
      if (previous)
        await supabase.storage
          .from("avatars")
          .remove([previous])
          .catch(() => undefined);
    },
    { invalidate: [qk.profile], success: "Profile photo updated" },
  );
  return (
    <div className="mb-6 rounded-2xl border bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={name} src={photo} className="size-16" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Profile photo</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Shown on your profile, sidebar and header.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG or WebP · up to 5 MB</p>
        </div>
      </div>
      <input
        ref={input}
        aria-label="Upload profile photo"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={action.isPending}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          const error = avatarFileError(file);
          if (error) {
            toast.error(error);
            return;
          }
          action.mutate(file);
        }}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={action.isPending}
          className="h-10 rounded-xl"
          onClick={() => input.current?.click()}
        >
          {action.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          {action.isPending ? "Updating photo..." : "Change photo"}
        </Button>
        {customPhoto && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl text-muted-foreground"
            disabled={action.isPending}
            onClick={() => action.mutate(null)}
          >
            <Trash2 className="size-4" />
            Remove custom photo
          </Button>
        )}
      </div>
      <p role="status" className="mt-3 text-[11px] text-muted-foreground">
        Photo changes save immediately.
      </p>
    </div>
  );
}
