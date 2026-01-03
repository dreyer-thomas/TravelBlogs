// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ChangePasswordForm from "../../src/components/account/change-password-form";

const push = vi.fn();
const signIn = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    push.mockReset();
    signIn.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows validation errors when fields are missing", async () => {
    render(
      <ChangePasswordForm
        userId="user-1"
        userEmail="user@example.com"
        callbackUrl="/trips"
        mustChangePassword
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText("Current password is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("New password is required."),
    ).toBeInTheDocument();
  });

  it("submits and redirects on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "user-1" }, error: null }),
    });
    signIn.mockResolvedValue({ error: null, url: "/trips" });

    render(
      <ChangePasswordForm
        userId="user-1"
        userEmail="user@example.com"
        callbackUrl="/trips"
        mustChangePassword={false}
      />,
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "OldPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "NewPass456!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }),
    });
    await screen.findByRole("button", { name: "Updating password..." });
    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: "user@example.com",
      password: "NewPass456!",
      callbackUrl: "/trips",
    });
    expect(push).toHaveBeenCalledWith("/trips");
  });

  it("shows an error when the API rejects the request", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        data: null,
        error: { code: "FORBIDDEN", message: "Current password is incorrect." },
      }),
    });

    render(
      <ChangePasswordForm
        userId="user-1"
        userEmail="user@example.com"
        callbackUrl="/trips"
        mustChangePassword={false}
      />,
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "WrongPass!" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "NewPass456!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText("Current password is incorrect."),
    ).toBeInTheDocument();
  });
});
