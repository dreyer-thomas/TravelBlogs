import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRIVACY_ACTIVITY_IDS,
  describePrivacyPolicyGaps,
  isPrivacyPolicyPublished,
  legalBasisEnvKey,
  readPrivacyPolicy,
  type PrivacyPolicy,
} from "../../src/utils/privacy-policy";
import { readSiteOperator } from "../../src/utils/site-operator";

const publishedEnv: Record<string, string> = {
  SITE_PRIVACY_EFFECTIVE_DATE: "2026-01-15",
  SITE_PRIVACY_RETENTION: "Kept until the trip is deleted.",
  SITE_PRIVACY_RIGHTS: "Write to the address in the legal notice.",
  SITE_PRIVACY_HOSTING: "Example Hosting GmbH, Musterstadt",
  SITE_PRIVACY_LEGAL_BASIS_ACCOUNT: "Art. 6(1)(b) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_TRIP_CONTENT: "Art. 6(1)(b) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_LOCATION: "Art. 6(1)(a) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_WEATHER: "Art. 6(1)(f) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_MAP_TILES: "Art. 6(1)(f) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_SHARE_LINKS: "Art. 6(1)(f) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_ACCESS_LOGS: "Art. 6(1)(f) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_VIEW_COUNTS: "Art. 6(1)(f) GDPR",
  SITE_PRIVACY_LEGAL_BASIS_COOKIES: "Sec. 25(2) TDDDG",
};

const operatorEnv: Record<string, string> = {
  SITE_OPERATOR_NAME: "Example Operator",
  SITE_OPERATOR_STREET: "Musterstraße 1",
  SITE_OPERATOR_POSTAL_CODE: "12345",
  SITE_OPERATOR_CITY: "Musterstadt",
  SITE_OPERATOR_EMAIL: "kontakt@example.com",
};

const operator = readSiteOperator(operatorEnv);

const published = (env: Record<string, string | undefined>) =>
  isPrivacyPolicyPublished(readPrivacyPolicy(env), operator);

describe("privacy activity inventory", () => {
  it("covers every processing activity the story requires", () => {
    expect([...PRIVACY_ACTIVITY_IDS]).toEqual([
      "account",
      "tripContent",
      "location",
      "weather",
      "mapTiles",
      "shareLinks",
      "accessLogs",
      "viewCounts",
      "cookies",
    ]);
  });

  // Without this, adding an activity ships a section whose legal basis the
  // operator has no documented way to set, and the page stays unpublished for
  // a reason nobody can find.
  it("documents every legal-basis variable in .env.example", () => {
    const example = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../.env.example"),
      "utf8",
    );

    for (const id of PRIVACY_ACTIVITY_IDS) {
      expect(example).toContain(`${legalBasisEnvKey(id)}=`);
    }

    for (const key of [
      "SITE_PRIVACY_EFFECTIVE_DATE",
      "SITE_PRIVACY_RETENTION",
      "SITE_PRIVACY_RIGHTS",
      "SITE_PRIVACY_HOSTING",
    ]) {
      expect(example).toContain(`${key}=`);
    }
  });

  it("derives the legal-basis env key from the activity id", () => {
    expect(legalBasisEnvKey("account")).toBe(
      "SITE_PRIVACY_LEGAL_BASIS_ACCOUNT",
    );
    expect(legalBasisEnvKey("tripContent")).toBe(
      "SITE_PRIVACY_LEGAL_BASIS_TRIP_CONTENT",
    );
    expect(legalBasisEnvKey("viewCounts")).toBe(
      "SITE_PRIVACY_LEGAL_BASIS_VIEW_COUNTS",
    );
  });
});

describe("readPrivacyPolicy", () => {
  it("normalizes unset and blank values to null", () => {
    const policy = readPrivacyPolicy({
      SITE_PRIVACY_EFFECTIVE_DATE: "   ",
      SITE_PRIVACY_RETENTION: undefined,
    });

    expect(policy.effectiveDate).toBeNull();
    expect(policy.retention).toBeNull();
    expect(policy.rights).toBeNull();
    expect(policy.hostingProvider).toBeNull();
    for (const id of PRIVACY_ACTIVITY_IDS) {
      expect(policy.legalBases[id]).toBeNull();
    }
  });

  it("reads and trims every configured value", () => {
    const policy = readPrivacyPolicy({
      ...publishedEnv,
      SITE_PRIVACY_RETENTION: "  Kept until the trip is deleted.  ",
    });

    expect(policy.effectiveDate).toBe("2026-01-15");
    expect(policy.retention).toBe("Kept until the trip is deleted.");
    expect(policy.rights).toBe("Write to the address in the legal notice.");
    expect(policy.hostingProvider).toBe("Example Hosting GmbH, Musterstadt");
    expect(policy.legalBases.account).toBe("Art. 6(1)(b) GDPR");
    expect(policy.legalBases.cookies).toBe("Sec. 25(2) TDDDG");
  });
});

describe("isPrivacyPolicyPublished", () => {
  it("is true only when the operator has completed every required field", () => {
    expect(published(publishedEnv)).toBe(true);
  });

  it("is false when nothing is configured", () => {
    expect(published({})).toBe(false);
  });

  it.each(PRIVACY_ACTIVITY_IDS)(
    "is false when the legal basis for %s is missing",
    (id) => {
      const env = { ...publishedEnv };
      delete env[legalBasisEnvKey(id)];

      expect(published(env)).toBe(false);
    },
  );

  it.each(["SITE_PRIVACY_RETENTION", "SITE_PRIVACY_RIGHTS"])(
    "is false when %s is missing",
    (key) => {
      const env = { ...publishedEnv };
      delete env[key];

      expect(published(env)).toBe(false);
    },
  );

  it("stays published when only the optional hosting provider is missing", () => {
    const env = { ...publishedEnv };
    delete env.SITE_PRIVACY_HOSTING;

    expect(published(env)).toBe(true);
  });

  // The same trap as SITE_OPERATOR_EMAIL=tbd in Story 17.1: a non-empty value
  // is not a correct one, and "in effect since tbd" is a worse statement than
  // an honest not-yet-published notice.
  it.each(["tbd", "soon", "01.10.2026", "2026-13-01", "2026-10-32"])(
    "refuses %s as an effective date",
    (value) => {
      expect(
        published({ ...publishedEnv, SITE_PRIVACY_EFFECTIVE_DATE: value }),
      ).toBe(false);
    },
  );

  it("refuses a date that does not exist in the calendar", () => {
    const policy: PrivacyPolicy = readPrivacyPolicy({
      ...publishedEnv,
      SITE_PRIVACY_EFFECTIVE_DATE: "2026-02-29",
    });

    // 2026 is not a leap year, so this date does not exist.
    expect(isPrivacyPolicyPublished(policy, operator)).toBe(false);
  });

  it("accepts a real, already-reached calendar date", () => {
    const policy: PrivacyPolicy = readPrivacyPolicy({
      ...publishedEnv,
      SITE_PRIVACY_EFFECTIVE_DATE: "2024-02-29",
    });

    // 2024 is a leap year, and the date is in the past.
    expect(isPrivacyPolicyPublished(policy, operator)).toBe(true);
  });

  // "In effect since" is a claim about the past. 9999-12-31 round-trips through
  // Date perfectly well, so only an explicit bound catches it.
  it.each(["9999-12-31", "2099-01-01"])(
    "refuses %s because it has not arrived yet",
    (value) => {
      expect(
        published({ ...publishedEnv, SITE_PRIVACY_EFFECTIVE_DATE: value }),
      ).toBe(false);
    },
  );

  // A non-empty value is not an answer. Before this, everything except the date
  // was guarded by trim().length > 0 alone.
  it.each(["tbd", "TBD", "todo", "n/a", "-", "xxx", "pending"])(
    "refuses %s as a legal basis",
    (value) => {
      expect(
        published({
          ...publishedEnv,
          SITE_PRIVACY_LEGAL_BASIS_ACCOUNT: value,
        }),
      ).toBe(false);
    },
  );

  it.each(["SITE_PRIVACY_RETENTION", "SITE_PRIVACY_RIGHTS"])(
    "refuses a stub value for %s",
    (key) => {
      expect(published({ ...publishedEnv, [key]: "tbd" })).toBe(false);
    },
  );

  // Zero-width space and friends survive trim(), so a field made only of them
  // reads as configured to the code and as blank to every human.
  it("treats invisible characters as blank", () => {
    const policy = readPrivacyPolicy({
      ...publishedEnv,
      SITE_PRIVACY_LEGAL_BASIS_ACCOUNT: "\u200B\uFEFF",
    });

    expect(policy.legalBases.account).toBeNull();
    expect(isPrivacyPolicyPublished(policy, operator)).toBe(false);
  });

  // A policy that is "in effect" while naming no controller fails the first
  // thing Art. 13(1)(a) GDPR asks for.
  it("is false when the operator is not configured", () => {
    expect(
      isPrivacyPolicyPublished(
        readPrivacyPolicy(publishedEnv),
        readSiteOperator({}),
      ),
    ).toBe(false);
  });

  it("is false when the operator email is a placeholder", () => {
    expect(
      isPrivacyPolicyPublished(
        readPrivacyPolicy(publishedEnv),
        readSiteOperator({ ...operatorEnv, SITE_OPERATOR_EMAIL: "tbd" }),
      ),
    ).toBe(false);
  });
});

describe("describePrivacyPolicyGaps", () => {
  it("is empty when the policy is publishable", () => {
    expect(
      describePrivacyPolicyGaps(readPrivacyPolicy(publishedEnv), operator),
    ).toEqual([]);
  });

  // The reader-facing notice is deliberately generic, so the operator needs to
  // learn which of the twelve variables is at fault from somewhere.
  it("names the variable at fault", () => {
    const gaps = describePrivacyPolicyGaps(
      readPrivacyPolicy({
        ...publishedEnv,
        SITE_PRIVACY_EFFECTIVE_DATE: "01.10.2026",
      }),
      operator,
    );

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toContain("SITE_PRIVACY_EFFECTIVE_DATE");
    expect(gaps[0]).toContain("01.10.2026");
  });

  it("reports every missing legal basis at once", () => {
    const env = { ...publishedEnv };
    for (const id of PRIVACY_ACTIVITY_IDS) {
      delete env[legalBasisEnvKey(id)];
    }

    const gaps = describePrivacyPolicyGaps(readPrivacyPolicy(env), operator);

    expect(gaps).toHaveLength(PRIVACY_ACTIVITY_IDS.length);
    for (const id of PRIVACY_ACTIVITY_IDS) {
      expect(gaps.some((gap) => gap.includes(legalBasisEnvKey(id)))).toBe(true);
    }
  });

  it("reports an unconfigured operator", () => {
    const gaps = describePrivacyPolicyGaps(
      readPrivacyPolicy(publishedEnv),
      readSiteOperator({}),
    );

    expect(gaps).toEqual([
      "SITE_OPERATOR_* is incomplete, so the policy would name no controller",
    ]);
  });
});
