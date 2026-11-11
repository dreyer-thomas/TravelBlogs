// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import UserForm from "../../../src/components/admin/user-form";
import { LocaleProvider } from "../../../src/utils/locale-context";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}));

const renderForm = () =>
  render(
    <LocaleProvider>
      <UserForm />
    </LocaleProvider>,
  );

const fillForm = (email = "new.user@example.com") => {
  fireEvent.change(screen.getByLabelText(/^Email address/), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^Full name/), {
    target: { value: "New User" },
  });
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

const createdResponse = (invitationSent: boolean) =>
  new Response(
    JSON.stringify({
      data: { id: "u1", email: "new.user@example.com", invitationPending: true, invitationSent },
      error: null,
    }),
    { status: 201 },
  );

describe("UserForm", () => {
  it("shows validation errors when submitting missing fields", async () => {
    const { container } = renderForm();
    const form = container.querySelector("form");

    if (!form) {
      throw new Error("Expected user form to render.");
    }

    fireEvent.submit(form);

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
  });

  it("includes an Administrator option", () => {
    renderForm();

    expect(
      screen.getByRole("option", { name: "Administrator" }),
    ).toBeInTheDocument();
  });

  it("has no password field", () => {
    const { container } = renderForm();

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });
});

describe("UserForm invitation", () => {
  beforeEach(() => {
    refresh.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers German and English and defaults to German", () => {
    renderForm();

    const select = screen.getByLabelText("Email language");
    expect(select).toHaveValue("de");
    expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("sends the chosen language without a password and resets to German after success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createdResponse(true));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fillForm();
    fireEvent.change(screen.getByLabelText("Email language"), {
      target: { value: "en" },
    });
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/users");
    expect(JSON.parse(init.body)).toEqual({
      email: "new.user@example.com",
      name: "New User",
      role: "viewer",
      preferredLanguage: "en",
    });
    await waitFor(() => expect(screen.getByLabelText("Email language")).toHaveValue("de"));
    expect(refresh).toHaveBeenCalled();
  });

  it("sends German when the language is left alone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createdResponse(true));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fillForm();
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).preferredLanguage).toBe("de");
  });

  it("confirms the sent invitation with the address and clears the note on typing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createdResponse(true)));
    renderForm();

    fillForm();
    submit();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Invitation sent to new.user@example.com.",
    );
    expect(screen.getByLabelText(/^Email address/)).toHaveValue("");

    fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: "N" } });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("warns when the user was created but the mail was not sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createdResponse(false)));
    renderForm();

    fillForm();
    submit();

    expect(await screen.findByRole("status")).toHaveTextContent(
      'The user was created, but the invitation email could not be sent. Use "Resend invitation" in the list.',
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the server error on a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: null,
            error: { code: "DUPLICATE_USER", message: "Email already exists." },
          }),
          { status: 409 },
        ),
      ),
    );
    renderForm();

    fillForm();
    submit();

    expect(await screen.findByText("Email already exists.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByLabelText(/^Email address/)).toHaveValue("new.user@example.com");
  });
});
