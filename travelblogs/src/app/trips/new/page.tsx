import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import CreateTripForm from "../../../components/trips/create-trip-form";
import NewTripHeader from "../../../components/trips/new-trip-header";
import { authOptions } from "../../../utils/auth-options";

const NewTripPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/trips/new");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <NewTripHeader />
        <CreateTripForm />
      </main>
    </div>
  );
};

export default NewTripPage;
