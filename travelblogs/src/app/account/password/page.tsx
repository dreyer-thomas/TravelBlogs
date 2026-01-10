import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../utils/auth-options";
import ChangePasswordForm from "../../../components/account/change-password-form";
import ChangePasswordHeader from "../../../components/account/change-password-header";

type PasswordPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

const getSafeCallbackUrl = (callbackUrl?: string) => {
  if (callbackUrl && callbackUrl.startsWith("/")) {
    return callbackUrl;
  }
  return "/trips";
};

const PasswordPage = async ({ searchParams }: PasswordPageProps) => {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    const callbackUrl = getSafeCallbackUrl(searchParams?.callbackUrl);
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const callbackUrl = getSafeCallbackUrl(searchParams?.callbackUrl);
  const mustChangePassword = Boolean(session.user.mustChangePassword);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6">
      <main className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <ChangePasswordHeader />

        <ChangePasswordForm
          userId={session.user.id}
          userEmail={session.user.email}
          callbackUrl={callbackUrl}
          mustChangePassword={mustChangePassword}
        />
      </main>
    </div>
  );
};

export default PasswordPage;
