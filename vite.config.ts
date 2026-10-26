// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
// Load only server settings into the dev server. Never add these names to VITE_*.
const localServerEnv = loadEnv(
  process.env["NODE_ENV"] === "production" ? "production" : "development",
  process.cwd(),
  "",
);
for (const name of [
  "GEMINI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FITTRACK_SUPABASE_URL",
  "FITTRACK_SUPABASE_PUBLISHABLE_KEY",
  "FITTRACK_SUPABASE_SERVICE_ROLE_KEY",
  "MEAL_SCAN_ENABLED",
  "MEAL_SCAN_FREE_TIER_CONFIRMED",
  "MEAL_SCAN_ELIGIBILITY_CONFIRMED",
  "MEAL_SCAN_DAILY_LIMIT",
  "MEAL_SCAN_USER_DAILY_LIMIT",
  "MEAL_SCAN_RPM_LIMIT",
  "MEAL_SCAN_TPM_LIMIT",
]) {
  if (process.env[name] === undefined && localServerEnv[name] !== undefined)
    process.env[name] = localServerEnv[name];
}

export default defineConfig({
  ...(process.env["VERCEL"] ? { nitro: { preset: "vercel" } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
