import type { ReactNode } from "react";
import Link from "next/link";

import { formatDate, getTranslation, type Locale } from "../../utils/i18n";
import {
  PRIVACY_ACTIVITY_IDS,
  isPrivacyPolicyPublished,
  type PrivacyActivityId,
  type PrivacyPolicy,
} from "../../utils/privacy-policy";
import {
  isOperatorIdentityConfigured,
  isValidOperatorEmail,
  type SiteOperator,
} from "../../utils/site-operator";

type PrivacyPolicyContentProps = {
  policy: PrivacyPolicy;
  operator: SiteOperator;
  locale: Locale;
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-3 border-t border-black/10 pt-6">
    <h2 className="text-lg font-semibold text-[#2D2A26]">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <dt className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
      {label}
    </dt>
    <dd className="text-sm text-[#2D2A26]">{children}</dd>
  </div>
);

/**
 * Presentational privacy policy body.
 *
 * The inventory is rendered unconditionally and the operator's legal values are
 * rendered only when they exist, because the two are different kinds of claim.
 * "Your browser loads map tiles from tile.openstreetmap.org" is a fact about
 * this code that holds whether or not anyone has written a policy; "the legal
 * basis for that is Art. 6(1)(f)" is the operator's assessment of their own
 * processing, and is left visibly blank until they make it.
 */
const PrivacyPolicyContent = ({
  policy,
  operator,
  locale,
}: PrivacyPolicyContentProps) => {
  const t = (key: string) => getTranslation(key, locale);
  const activity = (id: PrivacyActivityId, field: string) =>
    t(`legal.privacy.activities.${id}.${field}`);

  const published = isPrivacyPolicyPublished(policy, operator);
  const identityConfigured = isOperatorIdentityConfigured(operator);
  const emailUsable = isValidOperatorEmail(operator.email);

  /**
   * The operator's own wording is shown only once the policy is published.
   *
   * Without this the draft banner would state that what follows "is not a
   * statement by the operator" directly above the operator's half-finished
   * legal bases. The inventory below stays unconditional — it describes the
   * code, so it is true either way.
   */
  const legalValue = (value: string | null) => (published ? value : null);

  return (
    <div className="flex min-h-screen justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-3xl space-y-8 rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            {t("legal.privacy.title")}
          </h1>
          <p className="text-sm text-[#6B635B]">{t("legal.privacy.intro")}</p>
          {published ? (
            <p className="text-xs text-[#6B635B]">
              {t("legal.privacy.effectiveDateLabel")}{" "}
              <span className="font-medium text-[#2D2A26]">
                {formatDate(new Date(`${policy.effectiveDate}T00:00:00`), locale)}
              </span>
            </p>
          ) : null}
        </header>

        {published ? null : (
          <section className="space-y-2 rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 p-4">
            <h2 className="text-sm font-semibold text-[#B34A3C]">
              {t("legal.privacy.draftTitle")}
            </h2>
            <p className="text-sm text-[#2D2A26]">
              {t("legal.privacy.draftBody")}
            </p>
          </section>
        )}

        <Section title={t("legal.privacy.controllerTitle")}>
          {identityConfigured ? (
            <>
              <p className="text-sm text-[#6B635B]">
                {t("legal.privacy.controllerIntro")}
              </p>
              <address className="text-sm not-italic text-[#2D2A26]">
                <span className="block font-medium">{operator.name}</span>
                <span className="block">{operator.street}</span>
                <span className="block">
                  {`${operator.postalCode} ${operator.city}`}
                </span>
                {operator.country ? (
                  <span className="block">{operator.country}</span>
                ) : null}
                {emailUsable ? (
                  <a
                    className="mt-1 inline-block text-[#1F6F78] underline underline-offset-2"
                    href={`mailto:${operator.email}`}
                  >
                    {operator.email}
                  </a>
                ) : null}
              </address>
            </>
          ) : (
            <p className="text-sm text-[#6B635B]">
              {t("legal.privacy.controllerPending")}
            </p>
          )}
          <Link
            className="inline-block text-sm text-[#1F6F78] underline underline-offset-2"
            href="/impressum"
          >
            {t("legal.privacy.impressumLink")}
          </Link>
        </Section>

        <Section title={t("legal.privacy.thirdPartyTitle")}>
          <p className="text-sm text-[#2D2A26]">
            {t("legal.privacy.thirdPartyBody")}
          </p>
        </Section>

        <Section title={t("legal.privacy.serverSideTitle")}>
          <p className="text-sm text-[#2D2A26]">
            {t("legal.privacy.serverSideBody")}
          </p>
        </Section>

        <Section title={t("legal.privacy.inventoryTitle")}>
          <p className="text-sm text-[#6B635B]">
            {t("legal.privacy.inventoryIntro")}
          </p>

          <div className="space-y-6">
            {PRIVACY_ACTIVITY_IDS.map((id) => (
              <section
                className="space-y-3 rounded-xl border border-black/10 bg-[#FBF7F1]/60 p-5"
                key={id}
              >
                <h3 className="text-base font-semibold text-[#2D2A26]">
                  {activity(id, "title")}
                </h3>
                <dl className="space-y-3">
                  <Row label={t("legal.privacy.whatLabel")}>
                    {activity(id, "what")}
                  </Row>
                  <Row label={t("legal.privacy.whyLabel")}>
                    {activity(id, "why")}
                  </Row>
                  <Row label={t("legal.privacy.whereLabel")}>
                    <span className="block">{activity(id, "where")}</span>
                    {id === "mapTiles" ? (
                      <span className="mt-1 block font-medium">
                        {activity(id, "pages")}
                      </span>
                    ) : null}
                    {id === "accessLogs" && legalValue(policy.hostingProvider) ? (
                      <span className="mt-1 block">
                        <span className="text-[#6B635B]">
                          {t("legal.privacy.hostingLabel")}
                        </span>{" "}
                        {policy.hostingProvider}
                      </span>
                    ) : null}
                  </Row>
                  <Row label={t("legal.privacy.basisLabel")}>
                    {legalValue(policy.legalBases[id]) ?? (
                      <span className="text-[#B34A3C]">
                        {t("legal.privacy.basisPending")}
                      </span>
                    )}
                  </Row>
                </dl>
              </section>
            ))}
          </div>
        </Section>

        <Section title={t("legal.privacy.retentionTitle")}>
          <p className="whitespace-pre-line text-sm text-[#2D2A26]">
            {legalValue(policy.retention) ?? (
              <span className="text-[#B34A3C]">
                {t("legal.privacy.retentionPending")}
              </span>
            )}
          </p>
        </Section>

        <Section title={t("legal.privacy.rightsTitle")}>
          <p className="whitespace-pre-line text-sm text-[#2D2A26]">
            {legalValue(policy.rights) ?? (
              <span className="text-[#B34A3C]">
                {t("legal.privacy.rightsPending")}
              </span>
            )}
          </p>
        </Section>
      </main>
    </div>
  );
};

export default PrivacyPolicyContent;
