import type { Metadata } from "next";
import { headers } from "next/headers";

import ImpressumContent from "../../components/legal/impressum-content";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../utils/i18n";
import { readSiteOperator } from "../../utils/site-operator";

const resolveLocale = async () => {
  const headersList = await headers();
  return getLocaleFromAcceptLanguage(headersList.get("accept-language"));
};

/**
 * Title the route after the page itself rather than inheriting the generic site
 * title, so a search result or a browser tab identifies it as the legal notice.
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await resolveLocale();

  return {
    title: getTranslation("legal.impressum", locale),
    description: getTranslation("legal.impressumIntro", locale),
  };
};

/**
 * Publicly reachable Impressum.
 *
 * Renders per request: reading `accept-language` and the operator values from
 * the environment means a change to `.env` takes effect on restart without a
 * rebuild. The page itself is a server component that fetches no data, embeds
 * no view beacon and issues no external requests; the only client JavaScript on
 * the route comes from the shared providers and footer in the root layout.
 */
const ImpressumPage = async () => (
  <ImpressumContent operator={readSiteOperator()} locale={await resolveLocale()} />
);

export default ImpressumPage;
