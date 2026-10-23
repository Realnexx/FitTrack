import { describe, expect, it, vi } from "vitest";
import { avatarFileError, ownedAvatarPath, socialLinksFromForm } from "./profile-media";
const auth = vi.hoisted(() => ({ initialize: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
import { completeOAuthReturn } from "./oauth-return";
describe("profile media", () => {
  it("accepts supported photos and rejects empty, large or executable files", () => {
    expect(avatarFileError({ type: "image/png", size: 1200 })).toBeNull();
    expect(avatarFileError({ type: "image/svg+xml", size: 1200 })).toBeTruthy();
    expect(avatarFileError({ type: "image/jpeg", size: 0 })).toBeTruthy();
    expect(avatarFileError({ type: "image/webp", size: 5242881 })).toBeTruthy();
  });
  it("only removes photos owned by the current account on the same storage server", () => {
    const base = "https://example.com/storage/v1/object/public/avatars/me/new.png";
    expect(ownedAvatarPath(base, "me", base)).toBe("me/new.png");
    expect(ownedAvatarPath(base, "other", base)).toBeNull();
    expect(ownedAvatarPath(base, "me", "https://elsewhere.com/new.png")).toBeNull();
  });
  it("validates social domains and removes blank links", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "github";
    input.value = "https://github.com/fittrack";
    form.append(input);
    expect(socialLinksFromForm(form)).toEqual({ github: input.value });
    input.value = "https://github.com.evil.test/person";
    expect(() => socialLinksFromForm(form)).toThrow();
    input.value = "https://name:secret@github.com/person";
    expect(() => socialLinksFromForm(form)).toThrow();
    input.value = "";
    expect(socialLinksFromForm(form)).toEqual({});
  });
});
describe("OAuth return", () => {
  it("awaits SDK callback processing before verifying the user", async () => {
    auth.initialize.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { id: "verified" } }, error: null });
    expect(await completeOAuthReturn()).toEqual({ id: "verified" });
    expect(auth.initialize.mock.invocationCallOrder.at(-1)).toBeLessThan(
      auth.getUser.mock.invocationCallOrder.at(-1)!,
    );
  });
  it("does not accept an existing session after a failed identity callback", async () => {
    auth.initialize.mockResolvedValue({ error: new Error("expired") });
    auth.getUser.mockClear();
    await expect(completeOAuthReturn()).rejects.toThrow("expired");
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});
