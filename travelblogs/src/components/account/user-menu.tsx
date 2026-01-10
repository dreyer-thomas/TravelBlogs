"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LanguageSelector from "./language-selector";
import { useTranslation } from "@/utils/use-translation";

type UserMenuProps = {
  name?: string | null;
  email: string;
  className?: string;
};

const getInitials = (name: string, email: string) => {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${first}${second}`.toUpperCase();
  }

  const emailBase = email.split("@")[0] ?? "";
  const pieces = emailBase.split(/[._-]+/).filter(Boolean);
  const first = pieces[0]?.[0] ?? emailBase[0] ?? "";
  const second = pieces[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

const UserMenu = ({ name, email, className }: UserMenuProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const initials = useMemo(() => getInitials(name ?? "", email), [name, email]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut({ callbackUrl: "/sign-in" });
  };

  const handleChangePassword = () => {
    setOpen(false);
    const callbackUrl = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
    router.push(`/account/password${callbackUrl}`);
  };

  const handleManual = () => {
    setOpen(false);
    router.push("/manual");
  };

  return (
    <div ref={menuRef} className={className ?? ""}>
      <button
        type="button"
        className="inline-flex min-w-[48px] items-center justify-center rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195C63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {initials || "U"}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 w-48 rounded-2xl border border-black/10 bg-white p-2 shadow-lg">
          <div className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            {t('account.account')}
          </div>
          <div className="px-3 py-2">
            <LanguageSelector />
          </div>
          <button
            type="button"
            onClick={handleManual}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#2D2A26] transition hover:bg-black/5"
          >
            {t('account.userManual')}
          </button>
          <button
            type="button"
            onClick={handleChangePassword}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#2D2A26] transition hover:bg-black/5"
          >
            {t('account.changePassword')}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#B34A3C] transition hover:bg-[#B34A3C]/10"
          >
            {t('account.checkOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default UserMenu;
