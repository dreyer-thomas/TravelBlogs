/**
 * Single source of truth for the operator details shown on the legal pages.
 *
 * Every field is optional on purpose: shipping an Impressum that contains an
 * invented name or address is a false statement about who runs the site, so the
 * pages render an explicit "not configured" state instead of a placeholder.
 */

export type SiteOperator = {
  name: string | null;
  legalForm: string | null;
  representative: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  register: string | null;
  vatId: string | null;
  contentResponsible: string | null;
  contentResponsibleAddress: string | null;
};

type OperatorEnv = Record<string, string | undefined>;

const REQUIRED_FIELDS = [
  "name",
  "street",
  "postalCode",
  "city",
  "email",
] as const satisfies readonly (keyof SiteOperator)[];

/**
 * Deliberately strict: it rejects the characters that would break or inject
 * into a `mailto:` URL (whitespace, `?`, `&`, `#`, `,`, `;`, angle brackets) so
 * the address can be interpolated into an href without escaping.
 */
const EMAIL_PATTERN = /^[^\s@,;:<>()[\]\\"'?&#/]+@[^\s@,;:<>()[\]\\"'?&#/]+\.[^\s@,;:<>()[\]\\"'?&#/]{2,}$/;

const readValue = (env: OperatorEnv, key: string): string | null => {
  const value = env[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Read the operator details from the environment.
 *
 * @param env - Environment to read from; defaults to `process.env`
 * @returns Operator details with every unset or blank value normalized to null
 */
export const readSiteOperator = (
  env: OperatorEnv = process.env,
): SiteOperator => ({
  name: readValue(env, "SITE_OPERATOR_NAME"),
  legalForm: readValue(env, "SITE_OPERATOR_LEGAL_FORM"),
  representative: readValue(env, "SITE_OPERATOR_REPRESENTATIVE"),
  street: readValue(env, "SITE_OPERATOR_STREET"),
  postalCode: readValue(env, "SITE_OPERATOR_POSTAL_CODE"),
  city: readValue(env, "SITE_OPERATOR_CITY"),
  country: readValue(env, "SITE_OPERATOR_COUNTRY"),
  email: readValue(env, "SITE_OPERATOR_EMAIL"),
  phone: readValue(env, "SITE_OPERATOR_PHONE"),
  register: readValue(env, "SITE_OPERATOR_REGISTER"),
  vatId: readValue(env, "SITE_OPERATOR_VAT_ID"),
  contentResponsible: readValue(env, "SITE_OPERATOR_CONTENT_RESPONSIBLE"),
  contentResponsibleAddress: readValue(
    env,
    "SITE_OPERATOR_CONTENT_RESPONSIBLE_ADDRESS",
  ),
});

/**
 * Whether the configured contact address is a usable email address.
 *
 * A non-empty value is not the same as a correct one: `SITE_OPERATOR_EMAIL=tbd`
 * would otherwise render a live `mailto:tbd` link on a page whose entire point
 * is to provide a working contact route.
 *
 * @param email - Candidate address, typically from `readSiteOperator`
 * @returns True when the value is a syntactically usable email address
 */
export const isValidOperatorEmail = (email: string | null): boolean =>
  email !== null && EMAIL_PATTERN.test(email);

/**
 * Whether enough operator details are present to render a meaningful Impressum.
 *
 * @param operator - Operator details, typically from `readSiteOperator`
 * @returns True when provider name, postal address and a valid contact email are set
 */
export const isSiteOperatorConfigured = (operator: SiteOperator): boolean =>
  REQUIRED_FIELDS.every((field) => operator[field] !== null) &&
  isValidOperatorEmail(operator.email);
