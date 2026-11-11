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
  preferredLanguage: "de" as const,
  invitationPending: false,
  createdAt: "2025-01-01T12:00:00.000Z",
};

const adminUser = {
  ...baseUser,
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "administrator" as const,
};

// The badge shows the code ("DE") and carries the full name as visually hidden text.
const languageBadge = (label: string) =>
  screen.getByText(`Email language: ${label}`).parentElement;

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

describe("UserList language controls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows each user's email language as a badge", () => {
    renderWithProvider(
      <UserList
        users={[
          baseUser,
          { ...adminUser, preferredLanguage: "en" as const },
        ]}
      />,
    );

    expect(languageBadge("Deutsch")).toHaveTextContent("DE");
    expect(languageBadge("English")).toHaveTextContent("EN");
  });

  it("sends only the language when it is changed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { ...baseUser, preferredLanguage: "en" },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    const select = screen.getByLabelText("Email language for Viewer User");
    expect(select).toHaveValue("de");
    expect(screen.getByRole("button", { name: "Save language" })).toBeDisabled();

    fireEvent.change(select, { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Save language" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferredLanguage: "en" }),
    });
    expect(
      (await screen.findByText("Email language: English")).parentElement,
    ).toHaveTextContent("EN");
    expect(screen.getByText("Viewer", { selector: "span" })).toBeInTheDocument();
  });

  it("rolls the language back when the update fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Language is invalid." },
        }),
        { status: 400 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.change(screen.getByLabelText("Email language for Viewer User"), {
      target: { value: "en" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save language" }));

    expect(await screen.findByText("Language is invalid.")).toBeInTheDocument();
    expect(languageBadge("Deutsch")).toHaveTextContent("DE");
    expect(screen.getByLabelText("Email language for Viewer User")).toHaveValue("de");
  });

  it("lets the default creator change their own language while the role stays locked", () => {
    const creator = {
      ...baseUser,
      id: "creator",
      role: "creator" as const,
    };
    renderWithProvider(<UserList users={[creator]} currentUserId="creator" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));

    expect(screen.getByLabelText("Role for Default creator")).toBeDisabled();
    expect(screen.getByLabelText("Email language for Default creator")).toBeEnabled();
  });

  it("lets an administrator change only their own language", () => {
    renderWithProvider(<UserList users={[adminUser]} currentUserId="admin-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));

    expect(screen.getByLabelText("Email language for Admin User")).toBeEnabled();
    expect(screen.getByLabelText("Role for Admin User")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete user" })).toBeDisabled();
  });

  it("locks role save and closing the panel while the language is saving", async () => {
    let resolveFetch: (response: Response) => void = () => {};
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(<UserList users={[baseUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.change(screen.getByLabelText("Role for Viewer User"), {
      target: { value: "creator" },
    });
    fireEvent.change(screen.getByLabelText("Email language for Viewer User"), {
      target: { value: "en" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save language" }));

    expect(screen.getByRole("button", { name: "Save role" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit user" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to update user." },
        }),
        { status: 500 },
      ),
    );

    expect(await screen.findByText("Unable to update user.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save role" })).toBeEnabled();
  });
});

describe("UserList invitations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pendingUser = {
    ...baseUser,
    id: "pending-1",
    email: "pending@example.com",
    name: "Pending User",
    invitationPending: true,
  };

  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status });

  it("shows the pending badge only for pending users", () => {
    renderWithProvider(<UserList users={[pendingUser, baseUser]} />);

    expect(screen.getAllByText("Invitation pending")).toHaveLength(1);
    const pendingRow = screen.getByText("Pending User").closest("article")!;
    expect(pendingRow).toHaveTextContent("Invitation pending");
  });

  it("offers resend only for pending and active users", () => {
    renderWithProvider(
      <UserList
        users={[
          pendingUser,
          { ...pendingUser, id: "pending-inactive", name: "Inactive Pending", isActive: false },
          baseUser,
        ]}
      />,
    );

    const buttons = screen.getAllByRole("button", { name: "Resend invitation" });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].closest("article")).toHaveTextContent("Pending User");
  });

  it("posts to the invitations endpoint and confirms on 201", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { data: { invitationSent: true }, error: null }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));

    expect(await screen.findByText("Invitation sent.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/pending-1/invitations",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the failure message on 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(502, {
          data: null,
          error: { code: "INVITATION_NOT_SENT", message: "The invitation email could not be sent." },
        }),
      ),
    );
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));

    expect(
      await screen.findByText("The invitation email could not be sent. Try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Invitation sent.")).toBeNull();
  });

  it("marks the row accepted when the server says the invitation is no longer pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(409, {
          data: null,
          error: { code: "INVITATION_NOT_PENDING", message: "server text" },
        }),
      ),
    );
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));

    expect(
      await screen.findByText("This user has already accepted the invitation."),
    ).toBeInTheDocument();
    expect(screen.queryByText("server text")).toBeNull();
    expect(screen.queryByText("Invitation pending")).toBeNull();
    expect(screen.queryByRole("button", { name: "Resend invitation" })).toBeNull();
  });

  it("marks the row inactive when the server says the user is inactive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(409, {
          data: null,
          error: { code: "USER_INACTIVE", message: "server text" },
        }),
      ),
    );
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));

    expect(
      await screen.findByText("Activate the user before resending the invitation."),
    ).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend invitation" })).toBeNull();
  });

  it("shows the server message for other errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(500, {
          data: null,
          error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to resend the invitation." },
        }),
      ),
    );
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));

    expect(await screen.findByText("Unable to resend the invitation.")).toBeInTheDocument();
  });

  it("disables delete while a resend is running", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));

    expect(await screen.findByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete user" })).toBeDisabled();
  });

  it("clears the resend notice when another action starts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { data: { invitationSent: true }, error: null }))
      .mockReturnValueOnce(new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    renderWithProvider(<UserList users={[pendingUser]} />);

    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));
    expect(await screen.findByText("Invitation sent.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit user" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(screen.queryByText("Invitation sent.")).toBeNull();
  });
});
