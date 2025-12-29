import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";

import { authOptions } from "../../../utils/auth-options";
import UsersDashboard from "../../../components/admin/users-dashboard";

export const dynamic = "force-dynamic";

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "viewer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const loadUsers = async (baseUrl: string, cookieHeader: string) => {
  const response = await fetch(`${baseUrl}/api/users`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Error(body?.error?.message ?? "Unable to load users.");
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

  if (session.user.id !== "creator") {
    redirect("/trips");
    return null;
  }

  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") ?? "";
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  let users: UserListItem[] = [];
  let loadError: string | null = null;

  try {
    users = await loadUsers(baseUrl, cookieHeader);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load users.";
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              Manage users
            </h1>
            <p className="mt-2 text-sm text-[#6B635B]">
              Create accounts for creators and viewers.
            </p>
          </div>
          <Link
            href="/trips"
            className="rounded-xl border border-[#1F6F78]/30 px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/10"
          >
            Back to trips
          </Link>
        </header>

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
