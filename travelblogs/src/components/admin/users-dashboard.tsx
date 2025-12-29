"use client";

import { useState } from "react";

import UserForm from "./user-form";
import UserList from "./user-list";

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "viewer";
  isActive: boolean;
  createdAt: string;
};

type UsersDashboardProps = {
  users: UserListItem[];
};

const UsersDashboard = ({ users }: UsersDashboardProps) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[#2D2A26]">Users</h2>
          <p className="mt-1 text-sm text-[#6B635B]">
            Manage creator and viewer accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
        >
          {showForm ? "Close form" : "Add user"}
        </button>
      </section>

      {showForm ? (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h3 className="text-base font-semibold text-[#2D2A26]">
            Create a user
          </h3>
          <p className="mt-2 text-sm text-[#6B635B]">
            Set a temporary password and choose the correct role.
          </p>
          <div className="mt-4">
            <UserForm />
          </div>
        </section>
      ) : null}

      <UserList users={users} />
    </div>
  );
};

export default UsersDashboard;
