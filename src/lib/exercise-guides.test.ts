// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { exerciseGuides } from "./exercise-guides";
describe("Starter exercise guidance coverage", () => {
  const migration = readFileSync(
    new URL("../../drizzle/migrations/0000_migration.sql", import.meta.url),
    "utf8",
  );
  const section = migration.split("-- SEED EXERCISES")[1]!.split("-- SEED FOODS")[0]!;
  const names = [...section.matchAll(/^\('([^']+)'/gm)].map((m) => m[1]!);
  it("provides a complete guide for each starter exercise", () => {
    expect(names).toHaveLength(12);
    for (const name of names) {
      const g = exerciseGuides[name];
      expect(g, name).toBeDefined();
      expect(g?.steps.length).toBeGreaterThanOrEqual(4);
      expect(g?.cue).toBeTruthy();
    }
  });
  it("ships both local image files for every guide", () => {
    for (const g of Object.values(exerciseGuides))
      for (let i = 0; i < 2; i++) {
        const path = new URL(
          `../../public/exercises/${g.slug}-${i}.${g.extension}`,
          import.meta.url,
        );
        expect(existsSync(path), path.pathname).toBe(true);
        const image = readFileSync(path);
        expect(image.length).toBeGreaterThan(100);
        if (g.extension === "jpg") expect(image.subarray(0, 2).toString("hex")).toBe("ffd8");
        else expect(image.toString()).toContain("<svg");
      }
  });
});
