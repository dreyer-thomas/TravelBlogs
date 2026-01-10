// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UserForm from "../../../src/components/admin/user-form";
import { LocaleProvider } from "../../../src/utils/locale-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("UserForm", () => {
  it("shows validation errors when submitting missing fields", async () => {
    const { container } = render(
      <LocaleProvider>
        <UserForm />
      </LocaleProvider>
    );
    const form = container.querySelector("form");

    if (!form) {
      throw new Error("Expected user form to render.");
    }

    fireEvent.submit(form);

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
  });

  it("includes an Administrator option", () => {
    render(
      <LocaleProvider>
        <UserForm />
      </LocaleProvider>
    );

    expect(
      screen.getByRole("option", { name: "Administrator" }),
    ).toBeInTheDocument();
  });
});
