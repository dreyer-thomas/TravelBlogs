import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Note: this is a documentation-completeness lint, not an end-to-end test.
// Automated cross-browser E2E coverage for rich text is out of scope for this
// story (see rich-text-e2e-plan.md "Cross-Browser QA Checklist" for the
// manual QA procedure instead).
describe("Rich text E2E plan documentation (doc lint, not a real E2E test)", () => {
  it("keeps the required sections present in rich-text-e2e-plan.md", () => {
    const planPath = resolve(__dirname, "rich-text-e2e-plan.md");

    if (!existsSync(planPath)) {
      throw new Error(
        `rich-text-e2e-plan.md not found at ${planPath} — the manual QA plan was moved, renamed, or deleted.`,
      );
    }

    const plan = readFileSync(planPath, "utf-8");

    expect(plan).toContain("# Rich Text End-to-End Test Plan");
    expect(plan).toContain("## Core Flows");
    expect(plan).toContain("## Data Fixtures");
    expect(plan).toContain("## Serialization Expectations");
    expect(plan).toContain("## Cross-Browser QA Checklist");
  });
});
