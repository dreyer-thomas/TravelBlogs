// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LocaleProvider } from "../../../src/utils/locale-context";

const findUsableAccountToken = vi.hoisted(() => vi.fn());

vi.mock("../../../src/utils/account-token", () => ({ findUsableAccountToken }));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import SetPasswordPage, { metadata } from "../../../src/app/set-password/page";

const TOKEN = "t".repeat(43);

const renderPage = async (token?: string | string[]) => {
  const element = await SetPasswordPage({ searchParams: Promise.resolve({ token }) });
  render(<LocaleProvider>{element}</LocaleProvider>);
};

describe("/set-password page", () => {
  beforeEach(() => {
    findUsableAccountToken.mockReset();
  });

  it("never sends the token on as a Referer and is not indexed", () => {
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("shows the form for a usable token", async () => {
    findUsableAccountToken.mockResolvedValue({ id: "t1", userId: "u1", type: "reset" });
    await renderPage(TOKEN);

    expect(findUsableAccountToken).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("keeps the reset heading for a reset token", async () => {
    findUsableAccountToken.mockResolvedValue({ id: "t1", userId: "u1", type: "reset" });
    await renderPage(TOKEN);

    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
  });

  it("shows the invitation heading for an invite token", async () => {
    findUsableAccountToken.mockResolvedValue({ id: "t1", userId: "u1", type: "invite" });
    await renderPage(TOKEN);

    expect(screen.getByRole("heading", { name: "Welcome to TravelBlogs" })).toBeInTheDocument();
    expect(screen.getByText("Choose a password for your account.")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("shows the invalid state for an unusable token", async () => {
    findUsableAccountToken.mockResolvedValue(null);
    await renderPage(TOKEN);

    expect(screen.getByText("This link is no longer valid")).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  it.each([[undefined], [[TOKEN, TOKEN]]])("shows the invalid state for token %j", async (token) => {
    await renderPage(token);

    expect(findUsableAccountToken).not.toHaveBeenCalled();
    expect(screen.getByText("This link is no longer valid")).toBeInTheDocument();
  });
});
