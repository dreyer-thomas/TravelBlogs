import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/utils/locale-context";
import { LocaleHtmlUpdater } from "@/components/layout/locale-html-updater";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TravelBlogs",
  description: "Media-first travel stories with private sharing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} antialiased`}>
        <LocaleProvider>
          <LocaleHtmlUpdater />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
