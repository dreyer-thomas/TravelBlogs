// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UserList from "../../../src/components/admin/user-list";
import { LocaleProvider } from "../../../src/utils/locale-context";

const baseUser = {
  id: "user-1",
  email: "viewer@example.com",
  name: "Viewer User",
  role: "viewer" as const,
  isActive: true,
  createdAt: "2025-01-01T12:00:00.000Z",
};

const adminUser = {
  ...baseUser,
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "administrator" as const,
};

const renderWithProvider = (component: React.ReactElement) =>
  render(<LocaleProvider>{component}</LocaleProvider>);

describe("UserList role controls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the created date with the shared formatter", () => {
    renderWithProvider(<UserList users={[baseUser]} />);

    expect(
      screen.getByText("Created January 1st, 2025"),
    ).toBeInTheDocument();
  });

  it("saves a role change from the edit panel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            ...baseUser,
            role: "creator",
            updatedAt: "2025-01-02T00:00:00.000Z",
          },
          error: null,
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.change(screen.getByLabelText("Role for Viewer User"), {
      target: { value: "creator" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "creator" }),
    });

    expect(await screen.findByText("Creator", { selector: "span" })).toBeInTheDocument();
  });

  it("shows an error when the update fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Role is invalid." },
        }),
        { status: 400 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.change(screen.getByLabelText("Role for Viewer User"), {
      target: { value: "creator" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(await screen.findByText("Role is invalid.")).toBeInTheDocument();
    expect(await screen.findByText("Viewer", { selector: "span" })).toBeInTheDocument();
  });

  it("shows Administrator in the role selector", () => {
    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));

    expect(
      screen.getByRole("option", { name: "Administrator" }),
    ).toBeInTheDocument();
  });

  it("surfaces guardrail errors when demotion is blocked", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Cannot remove the last active admin.",
          },
        }),
        { status: 403 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[adminUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.change(screen.getByLabelText("Role for Admin User"), {
      target: { value: "viewer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(
      await screen.findByText("Cannot remove the last active admin."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Role for Admin User"),
    ).toHaveValue("administrator");
  });
});

describe("UserList status controls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggles active status from the edit panel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            ...baseUser,
            isActive: false,
            updatedAt: "2025-01-02T00:00:00.000Z",
          },
          error: null,
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive: false }),
    });

    expect(await screen.findByText("Inactive")).toBeInTheDocument();
  });

  it("shows an error when status update fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "FORBIDDEN", message: "Account is locked." },
        }),
        { status: 403 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Account is locked.")).toBeInTheDocument();
    expect(await screen.findByText("Active")).toBeInTheDocument();
  });

  it("only shows the action relevant to the current status", () => {
    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));

    expect(screen.getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate" })).toBeNull();
  });

  it("disables the status toggle for the default creator when viewing self", () => {
    const creatorUser = {
      ...baseUser,
      id: "creator",
      email: "creator@example.com",
      name: "Creator",
      role: "creator" as const,
    };

    renderWithProvider(<UserList users={[creatorUser]} currentUserId="creator" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));

    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });
});

describe("UserList delete controls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires confirmation and surfaces delete errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "USER_HAS_TRIPS", message: "Reassign trips first." },
        }),
        { status: 409 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1", {
      method: "DELETE",
    });
    expect(await screen.findByText("Reassign trips first.")).toBeInTheDocument();
    expect(screen.getByText("Viewer User")).toBeInTheDocument();
  });
});
