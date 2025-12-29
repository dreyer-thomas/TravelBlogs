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
      error: "CredentialsSignin",
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
      url: "/trips?from=signin",
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

  it("shows auth error messages from query params", async () => {
    authErrorValue = "CredentialsSignin";

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
});
