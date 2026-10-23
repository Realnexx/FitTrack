import { test, expect } from "@playwright/test";
test("signed-out users cannot open the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
test("login validates empty input", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expect(page.getByText("Enter your password")).toBeVisible();
});
test("registration validates password confirmation", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Test User");
  await page.getByLabel("Email").fill("test@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByLabel("Confirm password").fill("different-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Passwords don't match")).toBeVisible();
});
test.describe("Disposable test-account flows", () => {
  test.skip(
    !process.env["FITTRACK_E2E_EMAIL"] ||
      !process.env["FITTRACK_E2E_PASSWORD"] ||
      process.env["FITTRACK_E2E_ALLOW_WRITES"] !== "1",
    "Requires a disposable account and explicit test-write opt-in.",
  );
  test("onboards if needed, saves a weight and meal, and completes a workout", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env["FITTRACK_E2E_EMAIL"]!);
    await page.getByLabel("Password", { exact: true }).fill(process.env["FITTRACK_E2E_PASSWORD"]!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    if (page.url().endsWith("/onboarding")) {
      await page.getByRole("button", { name: "Get started", exact: true }).click();
      await page.getByLabel("Full name").fill("E2E Test User");
      await page.getByLabel("Date of birth").fill("2000-01-01");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Save and open dashboard" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    }
    await page.goto("/progress");
    const marker = "e2e-" + Date.now();
    await page.getByLabel("Weight (kg)", { exact: true }).fill("49.1");
    await page.getByLabel("Notes (optional)").fill(marker);
    await page.getByRole("button", { name: "Save measurement" }).click();
    await expect(page.getByText(marker, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(marker, { exact: true })).toBeVisible();
    const row = page.getByTestId("weight-entry").filter({ hasText: marker });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Weight (kg)", { exact: true }).fill("49.2");
    await page.getByRole("button", { name: "Save measurement" }).click();
    await expect(row.getByText("49.2 kg", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
    await page.goto("/nutrition");
    await page.getByLabel("Search foods").fill("Cooked White Rice");
    await page.getByRole("button", { name: /Cooked White Rice/ }).click();
    await page.getByLabel("Quantity (g)").fill("200");
    await page.getByRole("button", { name: "Save food entry" }).click();
    await expect(
      page.getByTestId("food-entry").filter({ hasText: "Cooked White Rice" }),
    ).not.toHaveCount(0);
    await page.goto("/workouts");
    await page.getByRole("button", { name: "Start workout", exact: true }).first().click();
    await expect(page).toHaveURL(/\/workouts\/session\//);
    await page.getByRole("button", { name: "Complete set", exact: true }).first().click();
    await expect(page.getByText(/Set 1:/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Set 1:/)).toBeVisible();
    await page.getByRole("button", { name: "Finish workout", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Finish workout", exact: true })
      .click();
    await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toHaveCount(0);
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Progress reports" })).toBeVisible();
  });
});
