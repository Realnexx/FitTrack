import { useState } from "react";
import { cn } from "@/lib/utils";
/** Accept known profile/auth metadata fields without requiring a new profile column. */
export function profilePhoto(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  for (const key of [
    "avatar_url",
    "profile_image_url",
    "profile_picture_url",
    "photo_url",
    "picture",
  ]) {
    const candidate = row[key];
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {}
  }
  return null;
}
export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "FT";
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/15",
        className,
      )}
    >
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={`${name}'s profile`}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
