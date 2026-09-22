// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import PrivacyPolicyContent from "../../src/components/legal/privacy-policy-content";
import {
  PRIVACY_ACTIVITY_IDS,
  legalBasisEnvKey,
  readPrivacyPolicy,
  type PrivacyPolicy,
} from "../../src/utils/privacy-policy";
import { getTranslation, translationCatalog } from "../../src/utils/i18n";
import type { SiteOperator } from "../../src/utils/site-operator";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../../src");

const publishedEnv: Record<string, string> = {
  SITE_PRIVACY_EFFECTIVE_DATE: "2026-01-15",
  SITE_PRIVACY_RETENTION: "Kept until the operator deletes the trip.",
  SITE_PRIVACY_RIGHTS: "Write to the address in the legal notice.",
  SITE_PRIVACY_HOSTING: "Example Hosting GmbH, Musterstadt",
  ...Object.fromEntries(
    PRIVACY_ACTIVITY_IDS.map((id) => [
      legalBasisEnvKey(id),
      `Basis for ${id}`,
    ]),
  ),
};

const publishedPolicy: PrivacyPolicy = readPrivacyPolicy(publishedEnv);
const draftPolicy: PrivacyPolicy = readPrivacyPolicy({});

const configuredOperator: SiteOperator = {
  name: "Kontron Travel Stories",
  legalForm: null,
  representative: null,
  street: "Musterweg 7",
  postalCode: "01234",
  city: "Musterstadt",
  country: "Germany",
  email: "operator@example.invalid",
  phone: null,
  register: null,
  vatId: null,
  contentResponsible: null,
  contentResponsibleAddress: null,
};

const emptyOperator: SiteOperator = {
  name: null,
  legalForm: null,
  representative: null,
  street: null,
  postalCode: null,
  city: null,
  country: null,
  email: null,
  phone: null,
  register: null,
  vatId: null,
  contentResponsible: null,
  contentResponsibleAddress: null,
};

const renderPolicy = (overrides: Partial<Parameters<typeof PrivacyPolicyContent>[0]> = {}) =>
  render(
    <PrivacyPolicyContent
      policy={publishedPolicy}
      operator={configuredOperator}
      locale="en"
      {...overrides}
    />,
  );

// AC 3: every processing activity gets its own section.
describe("processing inventory (AC 3)", () => {
  it.each(PRIVACY_ACTIVITY_IDS)("renders a section for %s", (id) => {
    renderPolicy();

    const title = getTranslation(`legal.privacy.activities.${id}.title`, "en");
    expect(title).not.toBe(`legal.privacy.activities.${id}.title`);

    const heading = screen.getByRole("heading", { level: 3, name: title });
    const section = heading.closest("section");
    expect(section).not.toBeNull();

    // Each activity carries what / why / where, so the reader can tell what is
    // involved without reading the source code.
    for (const field of ["what", "why", "where"] as const) {
      const text = getTranslation(
        `legal.privacy.activities.${id}.${field}`,
        "en",
      );
      expect(text).not.toBe(`legal.privacy.activities.${id}.${field}`);
      expect(section!.textContent).toContain(text);
    }
  });

  it("names the trip content, account and share-link activities in plain words", () => {
    renderPolicy();

    expect(
      screen.getByRole("heading", { level: 3, name: "Account data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Trip content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Share links" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Server access logs" }),
    ).toBeInTheDocument();
  });

  it("states that the page-view counter stores no personal data", () => {
    renderPolicy();

    const section = screen
      .getByRole("heading", { level: 3, name: "Page-view counter" })
      .closest("section")!;

    expect(section.textContent).toContain("No personal data is stored");
    expect(section.textContent).toContain("no IP address");
    expect(section.textContent).toContain("no cookie");
  });
});

// AC 4: the one transfer that actually leaves the reader's browser.
describe("OpenStreetMap tile disclosure (AC 4)", () => {
  it("discloses the tile host, what is transmitted, and to whom", () => {
    renderPolicy();

    const section = screen
      .getByRole("heading", {
        level: 3,
        name: "Map tiles from OpenStreetMap",
      })
      .closest("section")!;

    const text = section.textContent ?? "";
    expect(text).toContain("tile.openstreetmap.org");
    expect(text).toContain("directly");
    expect(text).toContain("IP address");
    expect(text).toContain("User-Agent");
    expect(text).toContain("OpenStreetMap Foundation");
  });

  it("names the affected pages", () => {
    renderPolicy();

    const text =
      screen
        .getByRole("heading", { level: 3, name: "Map tiles from OpenStreetMap" })
        .closest("section")!.textContent ?? "";

    expect(text).toContain("shared trip");
    expect(text).toContain("shared entry");
    expect(text).toContain("full-screen map");
    // The same tile layers render for signed-in editors, so a list that names
    // only the share-link surfaces understates the transfer.
    expect(text).toContain("signed-in editors");
  });

  it("keeps the disclosure in the German catalog too", () => {
    renderPolicy({ locale: "de" });

    const text =
      screen
        .getByRole("heading", { level: 3, name: "Kartenkacheln von OpenStreetMap" })
        .closest("section")!.textContent ?? "";

    expect(text).toContain("tile.openstreetmap.org");
    expect(text).toContain("direkt");
    expect(text).toContain("IP-Adresse");
    expect(text).toContain("User-Agent");
    expect(text).toContain("OpenStreetMap Foundation");
    expect(text).toContain("freigegebene Reise");
    expect(text).toContain("freigegebene Eintrag");
    expect(text).toContain("Vollbildkarte");
  });

  // The disclosure has to track the code. Iterating a hardcoded list could only
  // ever detect removal; a fourth component is caught by scanning the tree and
  // asserting the set is exactly the documented one.
  it("matches the tile layers actually present in the source", () => {
    const documented = [
      "components/entries/entry-hero-map.tsx",
      "components/trips/fullscreen-trip-map.tsx",
      "components/trips/trip-map.tsx",
    ];

    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(full);
        }
        return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
      });

    const found = walk(srcDir)
      .filter((file) => readFileSync(file, "utf8").includes("tile.openstreetmap.org"))
      .map((file) => relative(srcDir, file).split(/[\\/]/).join("/"))
      // The policy catalog and the page that renders it name the host on
      // purpose; they are the disclosure, not a tile layer.
      .filter(
        (file) =>
          file !== "utils/i18n.ts" &&
          file !== "components/legal/privacy-policy-content.tsx",
      )
      .sort();

    expect(found).toEqual(documented);
  });
});

// AC 5: server-side services must not be described as browser transfers.
describe("server-side services (AC 5)", () => {
  it("states that Nominatim and Open-Meteo are called from the server", () => {
    renderPolicy();

    const section = screen
      .getByRole("heading", {
        level: 2,
        name: "Services this site calls from its own server",
      })
      .closest("section")!;

    const text = section.textContent ?? "";
    expect(text).toContain("Nominatim");
    expect(text).toContain("Open-Meteo");
    expect(text).toContain("never by your browser");
    expect(text).toContain("your IP address is never sent");
  });

  it("does not invent a Google Fonts transfer", () => {
    const { container } = renderPolicy();

    // next/font self-hosts Source Sans 3 at build time; claiming otherwise
    // would be as wrong as omitting a real transfer. Banning the bare word
    // "Google" would fail a correct policy whose hoster or legal basis names a
    // Google service, so the ban is on the font transfer itself.
    expect(container.textContent).not.toContain("Google Fonts");
    expect(container.textContent).not.toContain("fonts.googleapis");
    expect(container.textContent).not.toContain("fonts.gstatic");
  });
});

// AC 6: no generated legal wording is presented as the operator's own.
describe("unpublished state (AC 6)", () => {
  it("shows an explicit not-yet-published notice when nothing is configured", () => {
    renderPolicy({ policy: draftPolicy });

    expect(
      screen.getByText("This privacy policy is not yet published"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/In effect since/)).not.toBeInTheDocument();
  });

  // Counting every pending string on the page only worked because the three
  // catalog entries happen to share the same English wording: reword one and
  // the count breaks for an unrelated reason, render the wrong one in the wrong
  // place and it still passes. Assert per section instead.
  it("marks each missing legal basis as pending rather than inventing one", () => {
    renderPolicy({ policy: draftPolicy });

    const inventory = screen
      .getByRole("heading", { level: 2, name: "What this site processes" })
      .closest("section")!;

    expect(
      within(inventory as HTMLElement).getAllByText(
        getTranslation("legal.privacy.basisPending", "en"),
      ),
    ).toHaveLength(PRIVACY_ACTIVITY_IDS.length);
  });

  it.each([
    ["How long data is kept", "legal.privacy.retentionPending"],
    ["Your rights", "legal.privacy.rightsPending"],
  ])("marks the %s section as pending", (heading, key) => {
    renderPolicy({ policy: draftPolicy });

    const section = screen
      .getByRole("heading", { level: 2, name: heading })
      .closest("section")!;

    expect(
      within(section as HTMLElement).getByText(getTranslation(key, "en")),
    ).toBeInTheDocument();
  });

  // The draft banner states that what follows "is not a statement by the
  // operator". Rendering the operator's half-finished legal text underneath it
  // contradicted that on the same screen.
  it("withholds partially configured operator wording while unpublished", () => {
    const partial = readPrivacyPolicy({
      ...publishedEnv,
      SITE_PRIVACY_LEGAL_BASIS_COOKIES: undefined,
    });

    renderPolicy({ policy: partial });

    expect(
      screen.getByText("This privacy policy is not yet published"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Basis for mapTiles")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Kept until the operator deletes the trip."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Example Hosting GmbH, Musterstadt"),
    ).not.toBeInTheDocument();
  });

  // The gate now includes the operator: "in effect since <date>" above "no
  // responsible party can be named here" is not a publishable state.
  it("stays unpublished when the operator is not configured", () => {
    renderPolicy({ operator: emptyOperator });

    expect(
      screen.getByText("This privacy policy is not yet published"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/In effect since/)).not.toBeInTheDocument();
  });

  it("still renders the factual inventory while unpublished", () => {
    renderPolicy({ policy: draftPolicy });

    // The inventory describes the software, not the operator's legal position,
    // so withholding it would help nobody.
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Map tiles from OpenStreetMap",
      }),
    ).toBeInTheDocument();
  });

});

// Filed separately: a regression in these is a published-path defect, not an
// AC 6 one, and reporting it under "unpublished state" sends the next reader
// to the wrong place.
describe("published state", () => {
  it("shows the operator-supplied values once published", () => {
    renderPolicy();

    expect(screen.getByText(/In effect since/)).toBeInTheDocument();
    expect(
      screen.getByText("Kept until the operator deletes the trip."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Write to the address in the legal notice."),
    ).toBeInTheDocument();
    expect(screen.getByText("Basis for mapTiles")).toBeInTheDocument();
    expect(
      screen.queryByText("This privacy policy is not yet published"),
    ).not.toBeInTheDocument();
  });

  // A raw ISO string is not a date in German, and formatDate already exists.
  it.each([
    ["en", "January 15th, 2026"],
    ["de", "15. Januar 2026"],
  ] as const)("renders the effective date in %s", (locale, expected) => {
    renderPolicy({ locale });

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("names the hosting provider in the access-log section when set", () => {
    renderPolicy();

    const section = screen
      .getByRole("heading", { level: 3, name: "Server access logs" })
      .closest("section")!;

    expect(
      within(section as HTMLElement).getByText(
        "Example Hosting GmbH, Musterstadt",
      ),
    ).toBeInTheDocument();
  });

  // A retention schedule is naturally several lines; HTML collapses them.
  it("preserves line breaks in the retention and rights text", () => {
    const multiline = readPrivacyPolicy({
      ...publishedEnv,
      SITE_PRIVACY_RETENTION: "Trips: until deleted.\nLogs: 14 days.",
    });

    const { container } = renderPolicy({ policy: multiline });

    const paragraph = Array.from(container.querySelectorAll("p")).find((node) =>
      node.textContent?.includes("Logs: 14 days."),
    );

    expect(paragraph?.className).toContain("whitespace-pre-line");
  });
});

describe("controller", () => {
  it("names the operator and links to the legal notice", () => {
    renderPolicy();

    expect(screen.getByText("Kontron Travel Stories")).toBeInTheDocument();
    expect(screen.getByText("01234 Musterstadt")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "operator@example.invalid" }),
    ).toHaveAttribute("href", "mailto:operator@example.invalid");
    expect(
      screen.getByRole("link", { name: "Open the legal notice" }),
    ).toHaveAttribute("href", "/impressum");
  });

  it("says so plainly when the operator is not configured", () => {
    renderPolicy({ operator: emptyOperator });

    expect(
      screen.getByText(
        "The operator has not entered their details yet, so no responsible party can be named here.",
      ),
    ).toBeInTheDocument();
  });
});

// AC 7: bilingual, one route.
describe("translation coverage (AC 7)", () => {
  it.each(["en", "de"] as const)(
    "resolves every privacy key in the %s catalog",
    (locale) => {
      const keys = [
        "legal.privacy.title",
        "legal.privacy.intro",
        "legal.privacy.draftTitle",
        "legal.privacy.draftBody",
        "legal.privacy.effectiveDateLabel",
        "legal.privacy.controllerTitle",
        "legal.privacy.controllerIntro",
        "legal.privacy.controllerPending",
        "legal.privacy.impressumLink",
        "legal.privacy.inventoryTitle",
        "legal.privacy.inventoryIntro",
        "legal.privacy.whatLabel",
        "legal.privacy.whyLabel",
        "legal.privacy.whereLabel",
        "legal.privacy.basisLabel",
        "legal.privacy.basisPending",
        "legal.privacy.hostingLabel",
        "legal.privacy.retentionTitle",
        "legal.privacy.retentionPending",
        "legal.privacy.rightsTitle",
        "legal.privacy.rightsPending",
        "legal.privacy.thirdPartyTitle",
        "legal.privacy.thirdPartyBody",
        "legal.privacy.serverSideTitle",
        "legal.privacy.serverSideBody",
        ...PRIVACY_ACTIVITY_IDS.flatMap((id) =>
          ["title", "what", "why", "where"].map(
            (field) => `legal.privacy.activities.${id}.${field}`,
          ),
        ),
        "legal.privacy.activities.mapTiles.pages",
      ];

      for (const key of keys) {
        expect(getTranslation(key, locale)).not.toBe(key);
      }
    },
  );

  // getTranslation falls back to the key itself, so a subtree missing from one
  // language renders "legal.privacy.activities.weather.what" to the reader
  // instead of failing anywhere. The hand-maintained list above cannot catch a
  // key added later; walking both catalogs can.
  it("has the same key structure in both languages", () => {
    const paths = (value: unknown, prefix = ""): string[] => {
      if (value === null || typeof value !== "object") {
        return [prefix];
      }
      return Object.entries(value as Record<string, unknown>).flatMap(
        ([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key),
      );
    };

    const en = new Set(paths(translationCatalog.en));
    const de = new Set(paths(translationCatalog.de));

    // Two empty sets would compare equal and prove nothing.
    expect(en.size).toBeGreaterThan(100);
    expect([...en].filter((key) => key.startsWith("legal.privacy."))).not.toEqual(
      [],
    );

    expect([...en].filter((key) => !de.has(key)).sort()).toEqual([]);
    expect([...de].filter((key) => !en.has(key)).sort()).toEqual([]);
  });

  it("renders German headings from the catalog", () => {
    renderPolicy({ locale: "de" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Datenschutzerklärung" }),
    ).toBeInTheDocument();
    // One legal-basis row per activity, so this is deliberately getAllByText.
    expect(screen.getAllByText("Rechtsgrundlage")).toHaveLength(
      PRIVACY_ACTIVITY_IDS.length,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Aufrufzähler" }),
    ).toBeInTheDocument();
  });
});

// AC 8: the page must not pull in anything third-party of its own.
describe("no third-party requests from this page (AC 8)", () => {
  it("renders no image, iframe, script or external link", () => {
    const { container } = renderPolicy();

    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    expect(container.querySelectorAll("script")).toHaveLength(0);

    for (const anchor of Array.from(container.querySelectorAll("a"))) {
      const href = anchor.getAttribute("href") ?? "";
      expect(href.startsWith("/") || href.startsWith("mailto:")).toBe(true);
    }
  });

  it("keeps the route a server component with no map or beacon", () => {
    const page = readFileSync(join(srcDir, "app/datenschutz/page.tsx"), "utf8");
    const content = readFileSync(
      join(srcDir, "components/legal/privacy-policy-content.tsx"),
      "utf8",
    );

    for (const source of [page, content]) {
      expect(source).not.toContain("use client");
      expect(source).not.toContain("ViewBeacon");
      expect(source).not.toContain("leaflet");
      expect(source).not.toContain("TripMap");
    }
  });
});
