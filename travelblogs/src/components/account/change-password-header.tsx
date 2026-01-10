"use client";

import { useTranslation } from "../../utils/use-translation";

const ChangePasswordHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="space-y-2 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
        {t('account.accountSecurity')}
      </p>
      <h1 className="text-3xl font-semibold text-[#2D2A26]">
        {t('account.changePassword')}
      </h1>
      <p className="text-sm text-[#6B635B]">
        {t('account.updatePasswordToContinue')}
      </p>
    </header>
  );
};

export default ChangePasswordHeader;
