import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60000,
  use: {
    baseURL: process.env["FITTRACK_E2E_URL"] ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  ...(process.env["FITTRACK_E2E_URL"]
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --host 127.0.0.1 --port 5173",
          url: "http://127.0.0.1:5173",
          reuseExistingServer: !process.env["CI"],
          timeout: 120000,
        },
      }),
});
