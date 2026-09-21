"use client";

import Link from "next/link";

import { useTranslation } from "../../utils/use-translation";

/**
 * Quiet site-wide footer carrying the legal links.
 *
 * Mounted once in the root layout so every surface — including the public
 * shared trip, entry and map pages — reaches the Impressum in one click.
 */
const SiteFooter = () => {
  const { t } = useTranslation();

  return (
    // The fixed height must stay in step with --site-footer-h, which
    // globals.css subtracts from every min-h-screen page shell.
    <footer className="flex h-[var(--site-footer-h)] items-center border-t border-black/5 bg-[#FBF7F1] px-6">
      <nav
        aria-label={t("legal.footerLabel")}
        className="mx-auto flex w-full max-w-5xl justify-center gap-4 text-xs text-[#6B635B]"
      >
        <Link
          className="transition hover:text-[#2D2A26] hover:underline underline-offset-2"
          href="/impressum"
        >
          {t("legal.impressum")}
        </Link>
      </nav>
    </footer>
  );
};

export default SiteFooter;
