"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../../utils/use-translation";

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "administrator" | "viewer";
  isActive: boolean;
  createdAt: string;
};

type UserListProps = {
  users: UserListItem[];
  currentUserId?: string;
};

const getRoleOptions = (t: (key: string) => string): Array<{ value: UserListItem["role"]; label: string }> => [
  { value: "creator", label: t('admin.creator') },
  { value: "administrator", label: t('admin.administrator') },
  { value: "viewer", label: t('admin.viewer') },
];

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
  const { t, formatDate } = useTranslation();
  const roleOptions = getRoleOptions(t);
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
        throw new Error(result?.error?.message ?? t("admin.updateRoleError"));
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
        error instanceof Error ? error.message : t("admin.updateRoleError");

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
        throw new Error(
          result?.error?.message ?? t("admin.updateStatusError"),
        );
      }

      updateRow(row.id, (current) => ({
        ...current,
        saving: false,
        error: null,
        pendingIsActive: nextStatus,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("admin.updateStatusError");

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
        throw new Error(result?.error?.message ?? t("admin.deleteUserError"));
      }

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setEditingUserId(null);
      setConfirmDeleteId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("admin.deleteUserError");

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
        <h2 className="text-lg font-semibold text-[#2D2A26]">{t('admin.noUsersYet')}</h2>
        <p className="mt-2 text-sm text-[#6B635B]">
          {t("admin.noUsersDescription")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {rows.map((user) => {
        const isSelf = Boolean(currentUserId && user.id === currentUserId);
        const isDefaultCreator = user.id === "creator";
        const isLocked = isSelf;
        const isEditDisabled = isSelf && !isDefaultCreator;
        const isStatusLocked = isSelf && isDefaultCreator;
        const isEditing = editingUserId === user.id;
        const isDeleteConfirming = confirmDeleteId === user.id;
        const displayName = isDefaultCreator ? t("admin.defaultCreator") : user.name;
        const roleLabel =
          roleOptions.find((option) => option.value === user.role)?.label ??
          user.role;

        return (
        <article
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-5 py-4"
        >
          <div>
            <h3 className="text-base font-semibold text-[#2D2A26]">
              {displayName}
            </h3>
            <p className="text-sm text-[#6B635B]">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#2D2A26]">
            <span className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78]/10 px-3 py-1 text-[#1F6F78]">
              {roleLabel}
            </span>
            <span className="rounded-full border border-black/10 bg-[#F2ECE3] px-3 py-1 text-[#2D2A26]">
              {user.isActive ? t('admin.active') : t('admin.inactive')}
            </span>
            <span className="text-[#6B635B]">
              {t('admin.created')} {formatDate(new Date(user.createdAt))}
            </span>
            <button
              type="button"
              disabled={isEditDisabled}
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
              {t('admin.editUser')}
            </button>
          </div>
          {isEditing ? (
            <div className="w-full rounded-xl border border-black/10 bg-[#FBF7F1] px-4 py-3 text-sm text-[#2D2A26]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-[#2D2A26]">
                    <span className="sr-only">{`${t("admin.roleFor")} ${displayName}`}</span>
                    <select
                      aria-label={`${t("admin.roleFor")} ${displayName}`}
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
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
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
                    {user.saving ? t('admin.saving') : t('admin.saveRole')}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {user.isActive ? (
                    <button
                      type="button"
                      disabled={isStatusLocked || user.saving || user.deleting}
                      onClick={() => handleStatusToggle(user, false)}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D2A26] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('admin.deactivate')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isStatusLocked || user.saving || user.deleting}
                      onClick={() => handleStatusToggle(user, true)}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D2A26] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('admin.activate')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {isDeleteConfirming ? (
                    <>
                      <span className="text-[#B34A3C]">
                        {t("admin.deleteUserWarning")}
                      </span>
                      <button
                        type="button"
                        disabled={isLocked || user.saving || user.deleting}
                        onClick={() => handleDelete(user)}
                        className="rounded-full border border-[#B34A3C]/20 bg-[#B34A3C] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#9C3E32] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {user.deleting ? t('admin.deleting') : t('admin.confirmDelete')}
                      </button>
                      <button
                        type="button"
                        disabled={user.saving || user.deleting}
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#6B635B] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t('admin.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isLocked || user.saving || user.deleting}
                      onClick={() => setConfirmDeleteId(user.id)}
                      className="rounded-full border border-[#B34A3C]/20 bg-[#FCEDEA] px-3 py-1 text-xs font-semibold text-[#B34A3C] transition hover:bg-[#F7DCD7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('admin.deleteUser')}
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
                    {t("admin.cancel")}
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
