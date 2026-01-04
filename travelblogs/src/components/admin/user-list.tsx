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
  pendingIsActive: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
};

const buildRows = (users: UserListItem[]): UserListRow[] =>
  users.map((user) => ({
    ...user,
    pendingRole: user.role,
    pendingIsActive: user.isActive,
    saving: false,
    deleting: false,
    error: null,
  }));

const UserList = ({ users, currentUserId }: UserListProps) => {
  const [rows, setRows] = useState<UserListRow[]>(() => buildRows(users));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRows(buildRows(users));
    setEditingUserId(null);
    setConfirmDeleteId(null);
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
    if (row.saving || row.deleting || row.pendingRole === row.role) {
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

  const handleStatusToggle = async (row: UserListRow, nextStatus: boolean) => {
    if (row.saving || row.deleting || row.isActive === nextStatus) {
      return;
    }

    const previousStatus = row.isActive;

    updateRow(row.id, (current) => ({
      ...current,
      isActive: nextStatus,
      pendingIsActive: nextStatus,
      saving: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/users/${row.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.error) {
        throw new Error(result?.error?.message ?? "Unable to update status.");
      }

      updateRow(row.id, (current) => ({
        ...current,
        saving: false,
        error: null,
        pendingIsActive: nextStatus,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update status.";

      updateRow(row.id, (current) => ({
        ...current,
        saving: false,
        isActive: previousStatus,
        pendingIsActive: previousStatus,
        error: message,
      }));
    }
  };

  const handleDelete = async (row: UserListRow) => {
    if (row.saving || row.deleting) {
      return;
    }

    updateRow(row.id, (current) => ({
      ...current,
      deleting: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/users/${row.id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.error) {
        throw new Error(result?.error?.message ?? "Unable to delete user.");
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setEditingUserId(null);
      setConfirmDeleteId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete user.";

      updateRow(row.id, (current) => ({
        ...current,
        deleting: false,
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
        const isDeleteConfirming = confirmDeleteId === user.id;

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
                setConfirmDeleteId(null);
              }}
              className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78]/10 px-3 py-1 text-xs font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit User
            </button>
          </div>
          {isEditing ? (
            <div className="w-full rounded-xl border border-black/10 bg-[#FBF7F1] px-4 py-3 text-sm text-[#2D2A26]">
              <div className="space-y-3">
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
                      disabled={isLocked || user.saving || user.deleting}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="viewer">viewer</option>
                      <option value="creator">creator</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      isLocked ||
                      user.saving ||
                      user.deleting ||
                      user.pendingRole === user.role
                    }
                    onClick={() => handleSave(user)}
                    className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {user.saving ? "Saving..." : "Save role"}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {user.isActive ? (
                    <button
                      type="button"
                      disabled={isLocked || user.saving || user.deleting}
                      onClick={() => handleStatusToggle(user, false)}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D2A26] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLocked || user.saving || user.deleting}
                      onClick={() => handleStatusToggle(user, true)}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D2A26] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Activate
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {isDeleteConfirming ? (
                    <>
                      <span className="text-[#B34A3C]">
                        Delete this user? This cannot be undone.
                      </span>
                      <button
                        type="button"
                        disabled={isLocked || user.saving || user.deleting}
                        onClick={() => handleDelete(user)}
                        className="rounded-full border border-[#B34A3C]/20 bg-[#B34A3C] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#9C3E32] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {user.deleting ? "Deleting..." : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        disabled={user.saving || user.deleting}
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#6B635B] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isLocked || user.saving || user.deleting}
                      onClick={() => setConfirmDeleteId(user.id)}
                      className="rounded-full border border-[#B34A3C]/20 bg-[#FCEDEA] px-3 py-1 text-xs font-semibold text-[#B34A3C] transition hover:bg-[#F7DCD7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete user
                    </button>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    disabled={user.saving || user.deleting}
                    onClick={() => {
                      updateRow(user.id, (current) => ({
                        ...current,
                        pendingRole: current.role,
                        error: null,
                      }));
                      setEditingUserId(null);
                      setConfirmDeleteId(null);
                    }}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#6B635B] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
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
