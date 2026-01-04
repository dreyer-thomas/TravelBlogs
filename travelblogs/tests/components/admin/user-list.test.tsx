// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UserList from "../../../src/components/admin/user-list";

const baseUser = {
  id: "user-1",
  email: "viewer@example.com",
  name: "Viewer User",
  role: "viewer" as const,
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const adminUser = {
  ...baseUser,
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "administrator" as const,
};

describe("UserList role controls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
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

    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
    fireEvent.change(screen.getByLabelText("Role for Viewer User"), {
      target: { value: "creator" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(await screen.findByText("Role is invalid.")).toBeInTheDocument();
    expect(await screen.findByText("Viewer", { selector: "span" })).toBeInTheDocument();
  });

  it("shows Administrator in the role selector", () => {
    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));

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

    render(<UserList users={[adminUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
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

    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
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

    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Account is locked.")).toBeInTheDocument();
    expect(await screen.findByText("Active")).toBeInTheDocument();
  });

  it("only shows the action relevant to the current status", () => {
    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));

    expect(screen.getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate" })).toBeNull();
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

    render(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit User" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1", {
      method: "DELETE",
    });
    expect(await screen.findByText("Reassign trips first.")).toBeInTheDocument();
    expect(screen.getByText("Viewer User")).toBeInTheDocument();
  });
});
