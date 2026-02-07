import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../utils/auth-options";
import TripsRestoreDashboard from "../../../components/admin/trips-restore-dashboard";
import TripsRestorePageHeader from "../../../components/admin/trips-restore-page-header";

export const dynamic = "force-dynamic";

const TripsRestorePage = async () => {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin/trips-restore");
    return null;
  }

  const role = session.user.role;
  const isAdmin = role === "administrator";

  if (!isAdmin) {
    redirect("/trips");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <TripsRestorePageHeader />
        <TripsRestoreDashboard />
      </main>
    </div>
  );
};

export default TripsRestorePage;
