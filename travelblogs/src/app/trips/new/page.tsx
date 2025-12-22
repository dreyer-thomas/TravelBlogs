import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import CreateTripForm from "../../../components/trips/create-trip-form";
import { authOptions } from "../../../utils/auth-options";

const NewTripPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/trips/new");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            Trip Setup
          </p>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            Create a new trip
          </h1>
          <p className="text-sm text-[#6B635B]">
            Add the core details so you can start collecting entries right away.
          </p>
        </header>

        <CreateTripForm />
      </main>
    </div>
  );
};

export default NewTripPage;
