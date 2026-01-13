import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import { authOptions } from "../../utils/auth-options";
import TripsPageContent from "../../components/trips/trips-page-content";
import TripsNoAccess from "../../components/trips/trips-no-access";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../utils/i18n";

export const dynamic = "force-dynamic";

type TripListItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  updatedAt: string;
  canEditTrip: boolean;
  tags: string[];
};

const loadTrips = async (
  baseUrl: string,
  cookieHeader: string,
  t: (key: string) => string,
) => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Error(body?.error?.message ?? t("trips.unableLoadTrips"));
  }

  return (body?.data ?? []) as TripListItem[];
};

const TripsPage = async () => {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/trips");
  }

  const role = session.user.role ?? null;
  const isCreator = role === "creator";
  const isAdmin = role === "administrator";
  const isViewer = role === "viewer";
  const userEmail = session.user.email ?? "";

  if (!isCreator && !isViewer && !isAdmin) {
    return <TripsNoAccess />;
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
  let trips: TripListItem[] = [];
  let loadError: string | null = null;

  try {
    trips = await loadTrips(baseUrl, cookieHeader, t);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : t("trips.unableLoadTrips");
  }

  return (
    <TripsPageContent
      trips={trips}
      loadError={loadError}
      isViewer={isViewer}
      isCreator={isCreator}
      isAdmin={isAdmin}
      userName={session.user.name}
      userEmail={userEmail}
    />
  );
};

export default TripsPage;
