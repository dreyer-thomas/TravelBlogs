"use client";

import { useState } from "react";

import UserForm from "./user-form";
import UserList from "./user-list";
import { useTranslation } from "../../utils/use-translation";

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "administrator" | "viewer";
  isActive: boolean;
  createdAt: string;
};

type UsersDashboardProps = {
  users: UserListItem[];
  currentUserId?: string;
};

const UsersDashboard = ({ users, currentUserId }: UsersDashboardProps) => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[#2D2A26]">{t('admin.users')}</h2>
          <p className="mt-1 text-sm text-[#6B635B]">
            {t('admin.manageAccounts')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
        >
          {showForm ? t('admin.closeForm') : t('admin.addUser')}
        </button>
      </section>

      {showForm ? (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h3 className="text-base font-semibold text-[#2D2A26]">
            {t('admin.createUser')}
          </h3>
          <p className="mt-2 text-sm text-[#6B635B]">
            {t('admin.setTemporaryPassword')}
          </p>
          <div className="mt-4">
            <UserForm />
          </div>
        </section>
      ) : null}

      <UserList users={users} currentUserId={currentUserId} />
    </div>
  );
};

export default UsersDashboard;
