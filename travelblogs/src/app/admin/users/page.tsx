import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import { authOptions } from "../../../utils/auth-options";
import UsersDashboard from "../../../components/admin/users-dashboard";
import UsersPageHeader from "../../../components/admin/users-page-header";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../../utils/i18n";

export const dynamic = "force-dynamic";

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "administrator" | "viewer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const loadUsers = async (
  baseUrl: string,
  cookieHeader: string,
  t: (key: string) => string,
) => {
  const response = await fetch(`${baseUrl}/api/users`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Error(body?.error?.message ?? t("admin.unableLoadUsers"));
  }

  return (body?.data ?? []) as UserListItem[];
};

const AdminUsersPage = async () => {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin/users");
    return null;
  }

  const isAdmin =
    session.user.role === "creator" || session.user.role === "administrator";
  if (!isAdmin) {
    redirect("/trips");
    return null;
  }

  const headersList = await headers();
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const t = (key: string) => getTranslation(key, locale);
  const cookieHeader = headersList.get("cookie") ?? "";
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  let users: UserListItem[] = [];
  let loadError: string | null = null;

  try {
    users = await loadUsers(baseUrl, cookieHeader, t);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : t("admin.unableLoadUsers");
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <UsersPageHeader />

        {loadError ? (
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">{loadError}</p>
          </section>
        ) : (
          <UsersDashboard users={users} currentUserId={session.user.id} />
        )}
      </main>
    </div>
  );
};

export default AdminUsersPage;
