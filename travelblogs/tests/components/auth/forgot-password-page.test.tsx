// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ForgotPasswordPage from "../../../src/app/forgot-password/page";
import { LocaleProvider } from "../../../src/utils/locale-context";

const fetchMock = vi.fn();

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  const submit = (email: string) => {
    render(
      <LocaleProvider>
        <ForgotPasswordPage />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    fireEvent.click(screen.getByRole("button", { name: "Send link" }));
  };

  it("posts the address and replaces the form with the confirmation", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { accepted: true }, error: null }));

    submit(" viewer@example.com ");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for this address, we've sent a link",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/password-resets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "viewer@example.com" }),
      }),
    );
    expect(screen.queryByRole("button", { name: "Send link" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("shows a translated validation message on 400, not the server text", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "server text" },
      }),
    );

    submit("nope");

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("asks for an address when the field is empty, without posting", async () => {
    submit("   ");

    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a retry error rather than the confirmation on 500", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { data: null, error: { code: "X", message: "x" } }));

    submit("viewer@example.com");

    expect(
      await screen.findByText("Your request could not be sent. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a retry error when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    submit("viewer@example.com");

    expect(
      await screen.findByText("Your request could not be sent. Please try again."),
    ).toBeInTheDocument();
  });
});
