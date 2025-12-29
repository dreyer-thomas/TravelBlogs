"use client";

import { useEffect, useState } from "react";

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "viewer";
  isActive: boolean;
  createdAt: string;
};

type UserListProps = {
  users: UserListItem[];
  currentUserId?: string;
};

const formatDate = (value: string) => value.slice(0, 10);

type UserListRow = UserListItem & {
  pendingRole: UserListItem["role"];
  saving: boolean;
  error: string | null;
};

const buildRows = (users: UserListItem[]): UserListRow[] =>
  users.map((user) => ({
    ...user,
    pendingRole: user.role,
    saving: false,
    error: null,
  }));

const UserList = ({ users, currentUserId }: UserListProps) => {
  const [rows, setRows] = useState<UserListRow[]>(() => buildRows(users));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    setRows(buildRows(users));
    setEditingUserId(null);
  }, [users]);

  const updateRow = (
    userId: string,
    updater: (row: UserListRow) => UserListRow,
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.id === userId ? updater(row) : row)),
    );
  };

  const handleRoleChange = (
    userId: string,
    nextRole: UserListItem["role"],
  ) => {
    updateRow(userId, (row) => ({
      ...row,
      pendingRole: nextRole,
      error: null,
    }));
  };

  const handleSave = async (row: UserListRow) => {
    if (row.saving || row.pendingRole === row.role) {
      return;
    }

    const previousRole = row.role;
    const nextRole = row.pendingRole;

    updateRow(row.id, (current) => ({
      ...current,
      role: nextRole,
      saving: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/users/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: nextRole }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.error) {
        throw new Error(result?.error?.message ?? "Unable to update role.");
      }

      updateRow(row.id, (current) => ({
        ...current,
        saving: false,
        error: null,
        pendingRole: nextRole,
      }));
      setEditingUserId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update role.";

      updateRow(row.id, (current) => ({
        ...current,
        saving: false,
        role: previousRole,
        pendingRole: previousRole,
        error: message,
      }));
    }
  };

  if (users.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-[#2D2A26]">No users yet</h2>
        <p className="mt-2 text-sm text-[#6B635B]">
          Create the first account to invite someone into TravelBlogs.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {rows.map((user) => {
        const isLocked = Boolean(currentUserId && user.id === currentUserId);
        const isEditing = editingUserId === user.id;

        return (
        <article
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-5 py-4"
        >
          <div>
            <h3 className="text-base font-semibold text-[#2D2A26]">
              {user.name}
            </h3>
            <p className="text-sm text-[#6B635B]">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#2D2A26]">
            <span className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78]/10 px-3 py-1 text-[#1F6F78]">
              {user.role}
            </span>
            <span className="rounded-full border border-black/10 bg-[#F2ECE3] px-3 py-1 text-[#2D2A26]">
              {user.isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-[#6B635B]">
              Added {formatDate(user.createdAt)}
            </span>
            <button
              type="button"
              disabled={isLocked}
              aria-expanded={isEditing}
              onClick={() => {
                setEditingUserId((current) =>
                  current === user.id ? null : user.id,
                );
                handleRoleChange(user.id, user.role);
              }}
              className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78]/10 px-3 py-1 text-xs font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit User
            </button>
          </div>
          {isEditing ? (
            <div className="w-full rounded-xl border border-black/10 bg-[#FBF7F1] px-4 py-3 text-sm text-[#2D2A26]">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[#2D2A26]">
                  <span className="sr-only">{`Role for ${user.name}`}</span>
                  <select
                    aria-label={`Role for ${user.name}`}
                    value={user.pendingRole}
                    onChange={(event) =>
                      handleRoleChange(
                        user.id,
                        event.target.value as UserListItem["role"],
                      )
                    }
                    disabled={isLocked || user.saving}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="viewer">viewer</option>
                    <option value="creator">creator</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={isLocked || user.saving || user.pendingRole === user.role}
                  onClick={() => handleSave(user)}
                  className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {user.saving ? "Saving..." : "Save role"}
                </button>
                <button
                  type="button"
                  disabled={user.saving}
                  onClick={() => {
                    updateRow(user.id, (current) => ({
                      ...current,
                      pendingRole: current.role,
                      error: null,
                    }));
                    setEditingUserId(null);
                  }}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#6B635B] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
              {user.error ? (
                <p className="mt-2 text-xs text-[#B34A3C]">{user.error}</p>
              ) : null}
            </div>
          ) : null}
        </article>
        );
      })}
    </section>
  );
};

export default UserList;
