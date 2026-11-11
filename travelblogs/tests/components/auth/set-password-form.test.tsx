// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SetPasswordForm from "../../../src/components/account/set-password-form";
import { LocaleProvider } from "../../../src/utils/locale-context";

const replace = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const TOKEN = "t".repeat(43);

describe("SetPasswordForm", () => {
  beforeEach(() => {
    replace.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  const renderForm = (token: string | null = TOKEN) =>
    render(
      <LocaleProvider>
        <SetPasswordForm token={token} />
      </LocaleProvider>,
    );

  const fill = (password: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: confirm },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  };

  const expectInvalidState = async () => {
    expect(await screen.findByText("This link is no longer valid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.queryByLabelText("New password")).toBeNull();
  };

  it("shows the invalid state without a form when there is no usable token", async () => {
    renderForm(null);
    await expectInvalidState();
  });

  it("blocks passwords shorter than 8 characters", async () => {
    renderForm();
    fill("  short  ", "  short  ");

    expect(
      await screen.findByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks mismatching passwords", async () => {
    renderForm();
    fill("NewPass456!", "NewPass457!");

    expect(await screen.findByText("The passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts token and password and goes to sign-in on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { type: "reset" }, error: null }));
    renderForm();
    fill("NewPass456!", "NewPass456!");

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?passwordReset=1"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account-tokens/redeem",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: TOKEN, password: "NewPass456!" }),
      }),
    );
  });

  it("goes to the invitation notice after accepting an invitation", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { type: "invite" }, error: null }));
    renderForm();
    fill("NewPass456!", "NewPass456!");

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/sign-in?invitationAccepted=1"),
    );
  });

  it("falls back to the reset notice when the success body cannot be read", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
    renderForm();
    fill("NewPass456!", "NewPass456!");

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?passwordReset=1"));
  });

  it("switches to the invalid state on TOKEN_INVALID", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        data: null,
        error: { code: "TOKEN_INVALID", message: "This link is no longer valid." },
      }),
    );
    renderForm();
    fill("NewPass456!", "NewPass456!");

    await expectInvalidState();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a field error on VALIDATION_ERROR", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters." },
      }),
    );
    renderForm();
    fill("NewPass456!", "NewPass456!");

    expect(
      await screen.findByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
  });
});
