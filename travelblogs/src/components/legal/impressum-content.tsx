import type { ReactNode } from "react";

import { getTranslation, type Locale } from "../../utils/i18n";
import {
  isSiteOperatorConfigured,
  type SiteOperator,
} from "../../utils/site-operator";

type ImpressumContentProps = {
  operator: SiteOperator;
  locale: Locale;
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <dt className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
      {label}
    </dt>
    <dd className="text-sm break-words text-[#2D2A26]">{children}</dd>
  </div>
);

/**
 * Presentational Impressum body.
 *
 * Receives every operator value as a prop so no provider detail is hard-coded
 * in the component tree, and renders an explicit notice when the required
 * details are missing rather than any placeholder data.
 */
const ImpressumContent = ({ operator, locale }: ImpressumContentProps) => {
  const t = (key: string) => getTranslation(key, locale);
  const configured = isSiteOperatorConfigured(operator);

  return (
    <div className="flex min-h-screen justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl space-y-8 rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            {t("legal.impressum")}
          </h1>
          <p className="text-sm text-[#6B635B]">{t("legal.impressumIntro")}</p>
        </header>

        {configured ? (
          <dl className="space-y-6 border-t border-black/10 pt-6">
            <Field label={t("legal.provider")}>
              <span className="block font-medium">{operator.name}</span>
              {operator.legalForm ? (
                <span className="block">{operator.legalForm}</span>
              ) : null}
              <span className="block">{operator.street}</span>
              <span className="block">
                {`${operator.postalCode} ${operator.city}`}
              </span>
              {operator.country ? (
                <span className="block">{operator.country}</span>
              ) : null}
            </Field>

            {operator.representative ? (
              <Field label={t("legal.representative")}>
                {operator.representative}
              </Field>
            ) : null}

            <Field label={t("legal.contact")}>
              <span className="block">
                <span className="text-[#6B635B]">{t("legal.email")}</span>{" "}
                <a
                  className="text-[#1F6F78] underline underline-offset-2"
                  href={`mailto:${operator.email}`}
                >
                  {operator.email}
                </a>
              </span>
              {operator.phone ? (
                <span className="block">
                  <span className="text-[#6B635B]">{t("legal.phone")}</span>{" "}
                  {operator.phone}
                </span>
              ) : null}
            </Field>

            {operator.register ? (
              <Field label={t("legal.register")}>{operator.register}</Field>
            ) : null}

            {operator.vatId ? (
              <Field label={t("legal.vatId")}>{operator.vatId}</Field>
            ) : null}

            {operator.contentResponsible ? (
              <Field label={t("legal.contentResponsible")}>
                <span className="block">{operator.contentResponsible}</span>
                {operator.contentResponsibleAddress ? (
                  <span className="block">
                    {operator.contentResponsibleAddress}
                  </span>
                ) : null}
              </Field>
            ) : null}
          </dl>
        ) : (
          <section className="space-y-2 rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 p-4">
            <h2 className="text-sm font-semibold text-[#B34A3C]">
              {t("legal.notConfiguredTitle")}
            </h2>
            <p className="text-sm text-[#6B635B]">
              {t("legal.notConfiguredBody")}
            </p>
          </section>
        )}
      </main>
    </div>
  );
};

export default ImpressumContent;
