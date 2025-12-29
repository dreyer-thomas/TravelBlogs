const normalizeHost = (value: string | null) => {
  if (!value) {
    return null;
  }
  return value.split(",")[0]?.trim() || null;
};

export const getRequestBaseUrl = (headersList: Headers) => {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  const forwardedHost = normalizeHost(headersList.get("x-forwarded-host"));
  const host = forwardedHost ?? normalizeHost(headersList.get("host"));
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
};
