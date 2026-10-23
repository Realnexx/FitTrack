export function avatarFileError(file: Pick<File, "type" | "size">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPG, PNG or WebP image.";
  if (file.size > 5 * 1024 * 1024) return "Choose an image smaller than 5 MB.";
  if (file.size === 0) return "Choose a valid image file.";
  return null;
}
export const socialPlatforms = [
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { key: "facebook", label: "Facebook", hosts: ["facebook.com"] },
  { key: "github", label: "GitHub", hosts: ["github.com"] },
  { key: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { key: "x", label: "X / Twitter", hosts: ["x.com", "twitter.com"] },
];
export function socialLinksFromForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const links: Record<string, string> = {};
  for (const platform of socialPlatforms) {
    const value = String(data.get(platform.key) ?? "").trim();
    if (!value) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Enter a complete HTTPS link for ${platform.label}.`);
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !platform.hosts.some((host) => url.hostname === host || url.hostname === `www.${host}`)
    )
      throw new Error(`Use a valid ${platform.label} HTTPS profile link.`);
    links[platform.key] = url.href;
  }
  return links;
}
export function ownedAvatarPath(
  value: string | null | undefined,
  userId: string,
  newUrl: string,
): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (url.origin !== new URL(newUrl).origin) return null;
    const prefix = "/storage/v1/object/public/avatars/";
    if (!url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return path.startsWith(userId + "/") && !path.includes("..") ? path : null;
  } catch {
    return null;
  }
}
