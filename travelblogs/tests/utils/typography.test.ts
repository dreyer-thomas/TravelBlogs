import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const layoutPath = resolve(rootDir, "src/app/layout.tsx");
const globalsPath = resolve(rootDir, "src/app/globals.css");
const entryReaderPath = resolve(
  rootDir,
  "src/components/entries/entry-reader.tsx",
);
const tripOverviewPath = resolve(
  rootDir,
  "src/components/trips/trip-overview.tsx",
);
const tripDetailPath = resolve(
  rootDir,
  "src/components/trips/trip-detail.tsx",
);
const sharedTripPagePath = resolve(
  rootDir,
  "src/app/trips/share/[token]/page.tsx",
);
const keyViewPaths = [
  entryReaderPath,
  tripOverviewPath,
  tripDetailPath,
  sharedTripPagePath,
];

describe("global typography", () => {
  it("uses Source Sans 3 with system fallbacks and removes legacy serif fonts", () => {
    const layoutContent = readFileSync(layoutPath, "utf-8");
    const globalsContent = readFileSync(globalsPath, "utf-8");
    const keyViewContent = keyViewPaths
      .map((path) => readFileSync(path, "utf-8"))
      .join("\n");

    expect(layoutContent).toContain("Source_Sans_3");
    expect(layoutContent).not.toContain("Fraunces");
    expect(layoutContent).not.toContain("Source_Serif_4");

    expect(globalsContent).toMatch(/--font-sans:\s*var\(--font-source-sans-3\)/);
    expect(globalsContent).not.toMatch(/fraunces|source-serif/i);
    expect(globalsContent).toMatch(/"Segoe UI"/);
    expect(globalsContent).toMatch(/"Calibri"/);
    expect(globalsContent).toMatch(/"Arial"/);

    expect(keyViewContent).not.toMatch(/fraunces|source-serif/i);
  });

  it("keeps long-form entry text readable with expected size and line-height", () => {
    const entryReaderContent = readFileSync(entryReaderPath, "utf-8");

    expect(entryReaderContent).toContain("text-[17px]");
    expect(entryReaderContent).toContain("leading-7");
  });
});
