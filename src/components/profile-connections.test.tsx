import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  oauth: vi.fn(),
  link: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.oauth,
      linkIdentity: mocks.link,
      getUser: async () => ({ data: { user: { id: "owner" } } }),
      getUserIdentities: async () => ({
        data: { identities: [{ provider: "google" }] },
        error: null,
      }),
    },
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.com/storage/v1/object/public/avatars/${path}` },
        }),
      }),
    },
    from: () => ({ update: mocks.update }),
  },
}));
import { GoogleAuthButton } from "./google-auth-button";
import { ProfilePhotoEditor } from "./profile-photo-editor";
import { AccountConnections } from "./account-connections";
function mount(element: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {element}
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ data: {}, error: null });
  mocks.remove.mockResolvedValue({ data: {}, error: null });
  mocks.eq.mockResolvedValue({ data: {}, error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
});
afterEach(cleanup);
it("starts Google authentication with the current site's callback", async () => {
  mocks.oauth.mockResolvedValue({ error: null });
  mount(<GoogleAuthButton />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() =>
    expect(mocks.oauth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    }),
  );
  expect(screen.getByRole("button")).toBeDisabled();
});
it("recovers the Google button when the provider is unavailable", async () => {
  mocks.oauth.mockResolvedValue({ error: new Error("disabled") });
  mount(<GoogleAuthButton />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
  expect(screen.getByRole("button")).toBeEnabled();
});
it("uploads a photo to its owner's folder and saves its URL", async () => {
  mount(<ProfilePhotoEditor name="User" photo={null} />);
  fireEvent.change(screen.getByLabelText("Upload profile photo"), {
    target: { files: [new File(["image"], "photo.png", { type: "image/png" })] },
  });
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith({
      avatar_url: expect.stringMatching(/\/avatars\/owner\/.+\.png$/),
    }),
  );
  expect(mocks.upload.mock.calls[0]?.[0]).toMatch(/^owner\/.+\.png$/);
  expect(mocks.eq).toHaveBeenCalledWith("id", "owner");
});
it("cleans up a newly uploaded file if saving its profile fails", async () => {
  mocks.eq.mockResolvedValue({ data: null, error: { message: "save failed" } });
  mount(<ProfilePhotoEditor name="User" photo={null} />);
  fireEvent.change(screen.getByLabelText("Upload profile photo"), {
    target: { files: [new File(["image"], "photo.png", { type: "image/png" })] },
  });
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]?.[0]]));
});
it("shows actual connected providers and connects another to Settings", async () => {
  mocks.link.mockResolvedValue({ error: null });
  mount(<AccountConnections userId="owner" links={{}} onClose={() => {}} />);
  expect(await screen.findByText("Connected")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]!);
  await waitFor(() =>
    expect(mocks.link).toHaveBeenCalledWith({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=settings` },
    }),
  );
});
