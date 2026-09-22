/**
 * The operator-supplied half of the privacy policy.
 *
 * The page has two halves that must not be confused. The *inventory* — which
 * data this site processes, why, and where it goes — is an engineering fact,
 * derived from the source code and rendered unconditionally. The *legal*
 * half — the basis for each activity, retention periods, and how to exercise
 * data-subject rights — is a statement by the operator about their own
 * processing, and nobody but the operator can make it.
 *
 * So this module holds only the second half, and every field is optional. Until
 * the operator fills them in, the page says so. Generating plausible-looking
 * legal wording and presenting it as the operator's published policy would be a
 * false statement about a legal obligation, which is worse than an empty one.
 */

import {
  isSiteOperatorConfigured,
  type SiteOperator,
} from "./site-operator";

export const PRIVACY_ACTIVITY_IDS = [
  "account",
  "tripContent",
  "location",
  "weather",
  "mapTiles",
  "shareLinks",
  "accessLogs",
  "viewCounts",
  "cookies",
] as const;

export type PrivacyActivityId = (typeof PRIVACY_ACTIVITY_IDS)[number];

export type PrivacyPolicy = {
  effectiveDate: string | null;
  retention: string | null;
  rights: string | null;
  hostingProvider: string | null;
  legalBases: Record<PrivacyActivityId, string | null>;
};

type PolicyEnv = Record<string, string | undefined>;

/**
 * Derive the environment variable for an activity's legal basis.
 *
 * Derived rather than listed so that adding an activity to
 * `PRIVACY_ACTIVITY_IDS` cannot leave a section silently unconfigurable: there
 * is no second list to forget to update.
 *
 * @param id - Activity identifier from `PRIVACY_ACTIVITY_IDS`
 * @returns The `SITE_PRIVACY_LEGAL_BASIS_*` variable name for that activity
 */
export const legalBasisEnvKey = (id: PrivacyActivityId): string =>
  `SITE_PRIVACY_LEGAL_BASIS_${id.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

/**
 * Strict on purpose. An `Invalid Date` check alone would accept `2026-13-01`
 * by rolling it into the next year, and `2026-02-29` into March, so the parsed
 * date is compared back against the input.
 *
 * Future dates are rejected too: "In effect since" is a claim about the past,
 * and `9999-12-31` round-trips through `Date` perfectly well.
 *
 * @param value - Candidate value from the environment
 * @param now - Reference point for "not in the future"; defaults to the clock
 * @returns True when the value is a real calendar date that has already arrived
 */
const isIsoCalendarDate = (value: string, now: Date = new Date()): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return false;
  }

  return value <= now.toISOString().slice(0, 10);
};

/**
 * Values that look configured but say nothing.
 *
 * `trim().length > 0` is not the same test as "the operator answered this".
 * `SITE_PRIVACY_LEGAL_BASIS_ACCOUNT=tbd` would otherwise publish the policy and
 * render "Legal basis: tbd" as the operator's binding statement — the same trap
 * `SITE_OPERATOR_EMAIL=tbd` hit in Story 17.1, left open here for eleven of the
 * twelve fields.
 */
const PLACEHOLDER_VALUES = new Set([
  "-",
  "--",
  ".",
  "?",
  "n/a",
  "na",
  "none",
  "pending",
  "tba",
  "tbc",
  "tbd",
  "todo",
  "to do",
  "x",
  "xx",
  "xxx",
]);

/**
 * Minimum length for a free-text legal answer.
 *
 * Short enough to admit a terse but real citation ("Art. 6(1)(f) GDPR" is 18
 * characters), long enough to exclude the stub values a denylist cannot
 * anticipate.
 */
const MIN_MEANINGFUL_LENGTH = 12;

/**
 * Characters that render as nothing but survive `String.prototype.trim()`:
 * zero-width space, zero-width non-joiner/joiner, BOM and the soft hyphen.
 * A value made only of these is blank to every reader and non-blank to `trim`.
 */
const INVISIBLE_CHARACTERS = /[\u00AD\u200B-\u200D\uFEFF]/g;

const readValue = (env: PolicyEnv, key: string): string | null => {
  const value = env[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.replace(INVISIBLE_CHARACTERS, "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Whether a value is a real answer rather than a placeholder.
 *
 * @param value - Trimmed value from `readValue`, or null
 * @param minLength - Minimum length to require; omit for short citations
 * @returns True when the value is set, not a known stub, and long enough
 */
const isMeaningfulValue = (value: string | null, minLength = 0): boolean =>
  value !== null &&
  !PLACEHOLDER_VALUES.has(value.toLowerCase()) &&
  value.length >= minLength;

/**
 * Read the operator-supplied policy values from the environment.
 *
 * @param env - Environment to read from; defaults to `process.env`
 * @returns Policy values with every unset or blank value normalized to null
 */
export const readPrivacyPolicy = (env: PolicyEnv = process.env): PrivacyPolicy => {
  const legalBases = {} as Record<PrivacyActivityId, string | null>;
  for (const id of PRIVACY_ACTIVITY_IDS) {
    legalBases[id] = readValue(env, legalBasisEnvKey(id));
  }

  return {
    effectiveDate: readValue(env, "SITE_PRIVACY_EFFECTIVE_DATE"),
    retention: readValue(env, "SITE_PRIVACY_RETENTION"),
    rights: readValue(env, "SITE_PRIVACY_RIGHTS"),
    hostingProvider: readValue(env, "SITE_PRIVACY_HOSTING"),
    legalBases,
  };
};

/**
 * Every reason the policy is not fit to present as published.
 *
 * Returned as a list rather than a boolean because the all-or-nothing gate is
 * silent by design: an operator who set all twelve variables and mistyped one
 * date saw exactly the same page as one who set none, with no way to tell which
 * of the twelve was wrong.
 *
 * @param policy - Policy values, typically from `readPrivacyPolicy`
 * @param operator - Operator details, typically from `readSiteOperator`
 * @returns Human-readable gap descriptions; empty when the policy is publishable
 */
export const describePrivacyPolicyGaps = (
  policy: PrivacyPolicy,
  operator: SiteOperator,
): string[] => {
  const gaps: string[] = [];

  if (policy.effectiveDate === null) {
    gaps.push("SITE_PRIVACY_EFFECTIVE_DATE is not set");
  } else if (!isIsoCalendarDate(policy.effectiveDate)) {
    gaps.push(
      `SITE_PRIVACY_EFFECTIVE_DATE is not a past ISO date (YYYY-MM-DD): "${policy.effectiveDate}"`,
    );
  }

  if (!isMeaningfulValue(policy.retention, MIN_MEANINGFUL_LENGTH)) {
    gaps.push("SITE_PRIVACY_RETENTION is unset or a placeholder");
  }

  if (!isMeaningfulValue(policy.rights, MIN_MEANINGFUL_LENGTH)) {
    gaps.push("SITE_PRIVACY_RIGHTS is unset or a placeholder");
  }

  for (const id of PRIVACY_ACTIVITY_IDS) {
    if (!isMeaningfulValue(policy.legalBases[id])) {
      gaps.push(`${legalBasisEnvKey(id)} is unset or a placeholder`);
    }
  }

  if (!isSiteOperatorConfigured(operator)) {
    gaps.push(
      "SITE_OPERATOR_* is incomplete, so the policy would name no controller",
    );
  }

  return gaps;
};

/**
 * Whether the operator has completed the policy well enough to present it as
 * published.
 *
 * Deliberately all-or-nothing across the required fields: a policy that states
 * a legal basis for seven activities and leaves the eighth blank still reads as
 * a finished document, and the gap is exactly the thing a reader would never
 * notice. The hosting provider stays optional because the access-log section
 * remains accurate without naming it.
 *
 * The operator is part of the gate because a policy that is "in effect" while
 * naming no controller fails the first thing Art. 13(1)(a) GDPR asks for.
 *
 * @param policy - Policy values, typically from `readPrivacyPolicy`
 * @param operator - Operator details, typically from `readSiteOperator`
 * @returns True when nothing is missing, malformed or left as a placeholder
 */
export const isPrivacyPolicyPublished = (
  policy: PrivacyPolicy,
  operator: SiteOperator,
): boolean => describePrivacyPolicyGaps(policy, operator).length === 0;
