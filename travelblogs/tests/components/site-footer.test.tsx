// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readdirSync, lstatSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import SiteFooter from "../../src/components/layout/site-footer";
import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/font/google", () => ({
  Source_Sans_3: () => ({ variable: "--font-source-sans-3" }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "accept-language": "en-US,en;q=0.9" }),
}));

describe("SiteFooter", () => {
  it("links to the Impressum", () => {
    render(
      <LocaleProvider initialLocale="en">
        <SiteFooter />
      </LocaleProvider>,
    );

    const link = screen.getByRole("link", { name: "Legal Notice" });
    expect(link).toHaveAttribute("href", "/impressum");
  });

  it("keeps the route at /impressum in German", () => {
    render(
      <LocaleProvider initialLocale="de">
        <SiteFooter />
      </LocaleProvider>,
    );

    const link = screen.getByRole("link", { name: "Impressum" });
    expect(link).toHaveAttribute("href", "/impressum");
  });

  it("exposes a labelled navigation landmark", () => {
    render(
      <LocaleProvider initialLocale="en">
        <SiteFooter />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Legal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

describe("root layout", () => {
  it("mounts the footer so every public surface carries the legal links", async () => {
    const { default: RootLayout } = await import("../../src/app/layout");

    const markup = renderToStaticMarkup(
      await RootLayout({ children: <main>page body</main> }),
    );

    expect(markup).toContain('href="/impressum"');
    expect(markup).toContain("page body");
    expect(markup).toContain("<footer");
  });

  // Resolved from this file rather than process.cwd(), which vitest.config.ts
  // does not pin, so the guards hold wherever the suite is invoked from.
  const appDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/app",
  );

  it("keeps the footer-bearing root layout in place", () => {
    expect(existsSync(join(appDir, "layout.tsx"))).toBe(true);
  });

  it("has no global-error boundary, which would replace the root layout", () => {
    // Nested layouts do NOT bypass the footer -- Next composes them inside the
    // root layout. `global-error` is the one file that replaces it outright, so
    // it is what this guard has to watch for.
    const bypasses: string[] = [];

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const stats = lstatSync(full);
        if (stats.isSymbolicLink()) {
          continue;
        }
        if (stats.isDirectory()) {
          walk(full);
        } else if (/^global-error\.(tsx|ts|jsx|js)$/.test(name)) {
          bypasses.push(full);
        }
      }
    };
    walk(appDir);

    expect(bypasses).toEqual([]);
  });

  it.each([
    "trips/share/[token]",
    "trips/share/[token]/entries/[entryId]",
    "trips/share/[token]/map",
  ])("route %s inherits the root layout's footer", (route) => {
    // Every segment from the route up to src/app must be free of its own
    // layout file; if one appeared it would nest inside the root layout and
    // still carry the footer, but an intervening route group could not.
    const segments = route.split("/");
    const intermediate: string[] = [];

    for (let depth = segments.length; depth > 0; depth -= 1) {
      const dir = join(appDir, ...segments.slice(0, depth));
      for (const name of readdirSync(dir)) {
        if (/^layout\.(tsx|ts|jsx|js)$/.test(name)) {
          intermediate.push(join(dir, name));
        }
      }
    }

    expect(existsSync(join(appDir, ...segments))).toBe(true);
    expect(intermediate).toEqual([]);
  });
});
