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

    expect(
      await screen.findByText("creator", { selector: "span" }),
    ).toBeInTheDocument();
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
    expect(
      await screen.findByText("viewer", { selector: "span" }),
    ).toBeInTheDocument();
  });
});
