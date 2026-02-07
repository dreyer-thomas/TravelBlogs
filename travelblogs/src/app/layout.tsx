import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./leaflet.css";
import { LocaleProvider } from "@/utils/locale-context";
import { LocaleHtmlUpdater } from "@/components/layout/locale-html-updater";
import { getLocaleFromAcceptLanguage } from "@/utils/i18n";

export const metadata: Metadata = {
  title: "TravelBlogs",
  description: "Media-first travel stories with private sharing.",
};

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
      <body className="antialiased">
        <LocaleProvider initialLocale={initialLocale}>
          <LocaleHtmlUpdater />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
