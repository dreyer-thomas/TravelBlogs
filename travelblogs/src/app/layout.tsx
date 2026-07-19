import type { Metadata } from "next";
import { headers } from "next/headers";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./leaflet.css";
import { LocaleProvider } from "@/utils/locale-context";
import { LocaleHtmlUpdater } from "@/components/layout/locale-html-updater";
import { getLocaleFromAcceptLanguage, getTranslation } from "@/utils/i18n";
import { getRequestBaseUrl } from "@/utils/request-base-url";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans-3",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const title = getTranslation("site.title", locale);
  const description = getTranslation("site.description", locale);

  return {
    ...(baseUrl ? { metadataBase: new URL(baseUrl) } : {}),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: title,
      type: "website",
      locale: locale === "de" ? "de_DE" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const initialLocale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );

  return (
    <html lang={initialLocale}>
      <body className={`${sourceSans3.variable} antialiased`}>
        <LocaleProvider initialLocale={initialLocale}>
          <LocaleHtmlUpdater />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
