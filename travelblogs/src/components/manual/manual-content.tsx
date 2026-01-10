"use client";

import { useTranslation } from "../../utils/use-translation";

type Role = "administrator" | "creator" | "viewer";

type ManualContentProps = {
  role: Role | null;
};

const ManualContent = ({ role }: ManualContentProps) => {
  const { t } = useTranslation();

  if (!role) {
    return (
      <p className="text-center text-sm text-[#B34A3C]">
        {t('manual.unableDetermineRole')}
      </p>
    );
  }

  const isAdmin = role === "administrator";
  const isCreator = role === "creator" || isAdmin;
  const isViewer = role === "viewer";
  const showContributorSection = true;

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
          {t('manual.helpGuidance')}
        </p>
        <h1 className="text-3xl font-semibold text-[#2D2A26]">{t('manual.userManual')}</h1>
        <p className="text-sm text-[#6B635B]">
          {t('manual.navigateUse')}
        </p>
      </header>

      {/* Viewer Section */}
      {isViewer && (
        <section className="space-y-4 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold text-[#2D2A26]">
            {t('manual.viewerActions')}
          </h2>
          <p className="text-sm leading-relaxed text-[#6B635B]">
            {t('manual.viewerIntro')}
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
            <li>
              <strong>{t('manual.viewTrips')}:</strong> {t('common.trips').toLowerCase()}{" "}
              <code className="rounded bg-[#FBF7F1] px-1 py-0.5 text-xs">
                /trips
              </code>{" "}
              {t('manual.viewTripsDesc')}
            </li>
            <li>
              <strong>{t('manual.viewEntries')}:</strong> {t('manual.viewEntriesDesc')}
            </li>
            <li>
              <strong>{t('manual.fullScreenViewer')}:</strong> {t('manual.fullScreenViewerDesc')}
            </li>
            <li>
              <strong>{t('manual.tripOverview')}:</strong> {t('manual.tripOverviewDesc')}
            </li>
          </ul>
        </section>
      )}

      {/* Contributor Section */}
      {showContributorSection && (
        <section className="space-y-4 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold text-[#2D2A26]">
            {t('manual.contributorActions')}
          </h2>
          <p className="text-sm leading-relaxed text-[#6B635B]">
            {t('manual.contributorIntro')}
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
            <li>
              <strong>{t('manual.addEntry')}:</strong> {t('manual.addEntryDesc')}
            </li>
            <li>
              <strong>{t('manual.editEntry')}:</strong> {t('manual.editEntryDesc')}
            </li>
            <li>
              <strong>{t('manual.uploadMedia')}:</strong> {t('manual.uploadMediaDesc')}
            </li>
            <li>
              <strong>{t('manual.deleteEntry')}:</strong> {t('manual.deleteEntryDesc')}
            </li>
          </ul>
        </section>
      )}

      {/* Creator Section */}
      {isCreator && (
        <section className="space-y-4 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold text-[#2D2A26]">
            {t('manual.creatorActions')}
          </h2>
          <p className="text-sm leading-relaxed text-[#6B635B]">
            {t('manual.creatorIntro')}
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
            <li>
              <strong>{t('manual.createTrip')}:</strong> {t('common.trips').toLowerCase()}{" "}
              <code className="rounded bg-[#FBF7F1] px-1 py-0.5 text-xs">
                /trips
              </code>{" "}
              {t('manual.createTripDesc')}
            </li>
            <li>
              <strong>{t('manual.editTrip')}:</strong> {t('manual.editTripDesc')}
            </li>
            <li>
              <strong>{t('manual.deleteTrip')}:</strong> {t('manual.deleteTripDesc')}
            </li>
            <li>
              <strong>{t('manual.inviteViewers')}:</strong> {t('manual.inviteViewersDesc')}
            </li>
            <li>
              <strong>{t('manual.manageSharing')}:</strong> {t('manual.manageSharingDesc')}
            </li>
            <li>
              <strong>{t('manual.transferOwnership')}:</strong> {t('manual.transferOwnershipDesc')}
            </li>
          </ul>
        </section>
      )}

      {/* Administrator Section */}
      {isAdmin && (
        <section className="space-y-4 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold text-[#2D2A26]">
            {t('manual.administratorActions')}
          </h2>
          <p className="text-sm leading-relaxed text-[#6B635B]">
            {t('manual.administratorIntro')}
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
            <li>
              <strong>{t('manual.createUserAccounts')}:</strong> {t('manual.createUserAccountsDesc')}
            </li>
            <li>
              <strong>{t('manual.changeUserRoles')}:</strong> {t('manual.changeUserRolesDesc')}
            </li>
            <li>
              <strong>{t('manual.deactivateUsers')}:</strong> {t('manual.deactivateUsersDesc')}
            </li>
            <li>
              <strong>{t('manual.accessAllTrips')}:</strong> {t('manual.accessAllTripsDesc')}
            </li>
          </ul>
        </section>
      )}

      {/* Navigation Tips */}
      <section className="space-y-4 border-t border-black/10 pt-6">
        <h2 className="text-xl font-semibold text-[#2D2A26]">
          {t('manual.navigationTips')}
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
          <li>
            {t('manual.backButtons')} <strong>{t('manual.backButtonsStrong')}</strong> {t('manual.backButtonsDesc')}
          </li>
          <li>
            {t('manual.sharedView')} <strong>{t('manual.sharedViewStrong')}</strong> {t('manual.sharedViewDesc')}
          </li>
          <li>
            {t('manual.fullScreenProgress')}
          </li>
        </ul>
      </section>

      {/* Support Footer */}
      <footer className="border-t border-black/10 pt-6 text-center">
        <p className="text-xs text-[#6B635B]">
          {t('manual.needHelp')}
        </p>
      </footer>
    </div>
  );
};

export default ManualContent;
