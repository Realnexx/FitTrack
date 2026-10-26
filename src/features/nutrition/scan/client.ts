import { supabase } from "@/integrations/supabase/client";
let sessionRefresh: ReturnType<typeof supabase.auth.refreshSession> | null = null;
function refreshScannerSession() {
  if (!sessionRefresh)
    sessionRefresh = supabase.auth.refreshSession().finally(() => {
      sessionRefresh = null;
    });
  return sessionRefresh;
}
export async function scanRequest<T>(
  method: "GET" | "POST",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Please sign in before scanning a meal.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), method === "GET" ? 15000 : 60000);
  try {
    const send = (token: string) =>
      fetch("/api/meal-scan", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        cache: "no-store",
      });
    let response = await send(data.session.access_token);
    if (response.status === 401 && !controller.signal.aborted) {
      // The scanner rejects authentication before reserving quota or calling Gemini.
      // One authenticated retry therefore cannot duplicate a scan or meal save.
      const refreshed = await refreshScannerSession();
      if (refreshed.error || !refreshed.data.session)
        throw new Error(
          "Your sign-in session could not be renewed. Sign out of FitTrack and sign in again.",
        );
      await response.body?.cancel();
      response = await send(refreshed.data.session.access_token);
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        response.status === 404
          ? "The scanner endpoint is not deployed yet. Redeploy the latest app, or add food manually."
          : "The scanner returned an unexpected response. Please retry or use manual logging.",
      );
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
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error("The scanner took too long to respond. Check your connection and try again.");
    if (error instanceof TypeError)
      throw new Error("Could not reach the scanner. Check your connection and try again.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
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
