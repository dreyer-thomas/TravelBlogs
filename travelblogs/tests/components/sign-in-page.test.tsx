// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SignInPage from "../../src/app/sign-in/page";

const push = vi.fn();
const signIn = vi.fn();
let searchValue = "";
let authErrorValue = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "callbackUrl") {
        return searchValue || null;
      }
      if (key === "error") {
        return authErrorValue || null;
      }
      return null;
    },
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

describe("SignInPage", () => {
  beforeEach(() => {
    signIn.mockReset();
    push.mockReset();
    searchValue = "";
    authErrorValue = "";
  });

  it("shows an error when required fields are missing", async () => {
    render(<SignInPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Email and password are required."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows auth error messages from signIn", async () => {
    signIn.mockResolvedValue({
      error: "INVALID_CREDENTIALS",
      url: null,
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
  });

  it("redirects to callbackUrl on success", async () => {
    searchValue = "/trips?from=signin";
    signIn.mockResolvedValue({
      error: null,
      url: "http://localhost:3000/trips?from=signin",
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: "user@example.com",
      password: "Password123!",
      callbackUrl: "/trips?from=signin",
    });
    await screen.findByRole("button", { name: "Signing in..." });
    expect(push).toHaveBeenCalledWith("/trips?from=signin");
  });

  it("falls back when callbackUrl is protocol-relative", async () => {
    searchValue = "//evil.com";
    signIn.mockResolvedValue({
      error: null,
      url: "//evil.com",
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: "user@example.com",
      password: "Password123!",
      callbackUrl: "/trips",
    });
    await screen.findByRole("button", { name: "Signing in..." });
    expect(push).toHaveBeenCalledWith("/trips");
  });

  it("falls back when callbackUrl uses a non-http scheme", async () => {
    searchValue = "mailto:user@example.com";
    signIn.mockResolvedValue({
      error: null,
      url: "mailto:user@example.com",
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: "user@example.com",
      password: "Password123!",
      callbackUrl: "/trips",
    });
    await screen.findByRole("button", { name: "Signing in..." });
    expect(push).toHaveBeenCalledWith("/trips");
  });

  it("shows auth error messages from query params", async () => {
    authErrorValue = "INVALID_CREDENTIALS";

    render(<SignInPage />);

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
  });

  it("shows a generic error for unexpected auth errors", async () => {
    signIn.mockResolvedValue({
      error: "AccessDenied",
      url: null,
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Unable to sign in. Please try again."),
    ).toBeInTheDocument();
  });

  it("shows a generic error when signIn returns null", async () => {
    signIn.mockResolvedValue(null);

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Unable to sign in. Please try again."),
    ).toBeInTheDocument();
  });

  it("shows a generic error for unexpected query errors", async () => {
    authErrorValue = "AccessDenied";

    render(<SignInPage />);

    expect(
      await screen.findByText("Unable to sign in. Please try again."),
    ).toBeInTheDocument();
  });

  it("shows an inactive account error from auth", async () => {
    signIn.mockResolvedValue({
      error: "ACCOUNT_INACTIVE",
      url: null,
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Your account is inactive. Contact an admin."),
    ).toBeInTheDocument();
  });

  it("shows a not found message from query params", async () => {
    authErrorValue = "ACCOUNT_NOT_FOUND";

    render(<SignInPage />);

    expect(
      await screen.findByText("Account not found or has been removed."),
    ).toBeInTheDocument();
  });
});
