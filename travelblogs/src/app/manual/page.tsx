import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../utils/auth-options";
import ManualContent from "../../components/manual/manual-content";

type Role = "administrator" | "creator" | "viewer";

const ManualPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/manual");
  }

  const role = (session.user.role as Role) ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-3xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <ManualContent role={role} />
      </main>
    </div>
  );
};

export default ManualPage;
