import type { Metadata } from "next";
import { headers } from "next/headers";

import PrivacyPolicyContent from "../../components/legal/privacy-policy-content";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../utils/i18n";
import {
  describePrivacyPolicyGaps,
  readPrivacyPolicy,
} from "../../utils/privacy-policy";
import { readSiteOperator } from "../../utils/site-operator";

const resolveLocale = async () => {
  const headersList = await headers();
  return getLocaleFromAcceptLanguage(headersList.get("accept-language"));
};

/**
 * Last set of gaps warned about, so a misconfigured deployment logs once rather
 * than once per request. Reset implicitly whenever the gaps change, which is
 * what an operator editing `.env` and restarting wants to see.
 */
let lastWarnedGaps: string | null = null;

/**
 * Tell the operator why the page is still unpublished.
 *
 * The gate is all-or-nothing and the reader-facing notice is deliberately
 * generic, so without this an operator who set all twelve variables and
 * mistyped one date would see the same page as one who set none, with nothing
 * anywhere naming the variable at fault.
 */
const warnAboutGaps = (gaps: string[]) => {
  if (gaps.length === 0) {
    lastWarnedGaps = null;
    return;
  }

  const fingerprint = gaps.join("|");
  if (fingerprint === lastWarnedGaps) {
    return;
  }
  lastWarnedGaps = fingerprint;

  console.warn(
    `[privacy-policy] /datenschutz is showing the "not yet published" notice. ${gaps.length} item(s) to fix:\n  - ${gaps.join("\n  - ")}`,
  );
};

/**
 * Title the route after the page itself, so a reader who lands here from a
 * share link can tell what they are looking at from the tab alone.
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await resolveLocale();
  const published =
    describePrivacyPolicyGaps(readPrivacyPolicy(), readSiteOperator()).length ===
    0;

  return {
    title: getTranslation("legal.privacy.title", locale),
    description: getTranslation("legal.privacy.intro", locale),
    // A page that says of itself that it is not yet published has no business
    // in an index, and the footer links it from every public surface.
    robots: published ? undefined : { index: false, follow: true },
  };
};

/**
 * Publicly reachable privacy policy.
 *
 * The route stays `/datenschutz` in both languages: it is the path German
 * readers and German regulators look for, and moving it per locale would give
 * the same document two URLs.
 *
 * Renders per request, like the Impressum, so an edit to `.env` takes effect on
 * restart without a rebuild. The page is a server component that fetches
 * nothing, renders no map, embeds no view beacon and issues no external
 * request of its own — which is the point, given that the policy's headline
 * finding is that the map pages do exactly that.
 */
const PrivacyPolicyPage = async () => {
  const policy = readPrivacyPolicy();
  const operator = readSiteOperator();
  warnAboutGaps(describePrivacyPolicyGaps(policy, operator));

  return (
    <PrivacyPolicyContent
      policy={policy}
      operator={operator}
      locale={await resolveLocale()}
    />
  );
};

export default PrivacyPolicyPage;
