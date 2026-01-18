import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Rich text E2E plan documentation", () => {
  it("captures core flows and serialization expectations", () => {
    const planPath = resolve(__dirname, "rich-text-e2e-plan.md");
    const plan = readFileSync(planPath, "utf-8");

    expect(plan).toContain("# Rich Text End-to-End Test Plan");
    expect(plan).toContain("## Core Flows");
    expect(plan).toContain("## Data Fixtures");
    expect(plan).toContain("## Serialization Expectations");
    expect(plan).toContain("## Cross-Browser QA Checklist");
  });
});
