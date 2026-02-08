import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import { authOptions } from "../../../utils/auth-options";
import { prisma } from "../../../utils/db";
import TripsExportDashboard, {
  type TripExportItem,
} from "../../../components/admin/trips-export-dashboard";
import TripsExportPageHeader from "../../../components/admin/trips-export-page-header";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../../utils/i18n";
import { tripOrderBy } from "../../../utils/trip-ordering";

export const dynamic = "force-dynamic";

type TripExportRow = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  updatedAt: Date;
  ownerName?: string | null;
  ownerEmail?: string | null;
};

const loadTripsForExport = async (
  userId: string,
  role: "creator" | "administrator",
) => {
  const select = {
    id: true,
    title: true,
    startDate: true,
    endDate: true,
    ownerId: true,
    updatedAt: true,
  } as const;

  const trips = await prisma.trip.findMany({
    ...(role === "administrator" ? {} : { where: { ownerId: userId } }),
    select,
    orderBy: tripOrderBy,
  });
  const ownerIds = Array.from(new Set(trips.map((trip) => trip.ownerId)));
  const owners =
    ownerIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true, email: true },
        });
  const ownersById = new Map(
    owners.map((owner) => [owner.id, owner]),
  );

  return trips.map((trip) => ({
    ...trip,
    ownerName: ownersById.get(trip.ownerId)?.name ?? null,
    ownerEmail: ownersById.get(trip.ownerId)?.email ?? null,
  }));
};

const toExportItems = (rows: TripExportRow[]): TripExportItem[] =>
  rows.map((trip) => ({
    id: trip.id,
    title: trip.title,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    ownerId: trip.ownerId,
    ownerName: trip.ownerName ?? null,
    ownerEmail: trip.ownerEmail ?? null,
  }));

const TripsExportPage = async () => {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin/trips-export");
    return null;
  }

  const role = session.user.role;
  const isCreator = role === "creator";
  const isAdmin = role === "administrator";

  if (!isCreator && !isAdmin) {
    redirect("/trips");
    return null;
  }

  const headersList = await headers();
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const t = (key: string) => getTranslation(key, locale);

  let trips: TripExportItem[] = [];
  let loadError: string | null = null;

  try {
    const rows = await loadTripsForExport(session.user.id, role);
    trips = toExportItems(rows);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : t("admin.unableLoadTripExports");
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <TripsExportPageHeader />

        {loadError ? (
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">{loadError}</p>
          </section>
        ) : (
          <TripsExportDashboard trips={trips} showOwner={isAdmin} />
        )}
      </main>
    </div>
  );
};

export default TripsExportPage;
