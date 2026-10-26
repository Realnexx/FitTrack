import { supabase } from "@/integrations/supabase/client";
export async function scanRequest<T>(
  method: "GET" | "POST",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Please sign in before scanning a meal.");
  const response = await fetch("/api/meal-scan", {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Meal scanning is unavailable. Please use manual logging.");
  }
  if (!response.ok) {
    const error = new Error(result.message ?? "Meal scanning is unavailable.") as Error & {
      retryAt?: string;
      quota?: boolean;
    };
    error.retryAt = result.retry_at;
    error.quota = response.status === 429;
    throw error;
  }
  return result as T;
}
export async function prepareMealPhoto(
  file: File,
): Promise<{ file: File; preview: string; base64: string }> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size === 0 ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP meal photo smaller than 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this photo. Try another image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78),
    );
    if (!blob || blob.size > 524288)
      throw new Error("This photo is too large. Please take a simpler, closer photo.");
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the photo."));
      reader.readAsDataURL(blob);
    });
    return {
      file: new File([blob], "meal.jpg", { type: "image/jpeg" }),
      preview: data,
      base64: data.split(",")[1]!,
    };
  } finally {
    bitmap.close();
  }
}
