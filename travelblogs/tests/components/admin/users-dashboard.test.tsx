// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UsersDashboard from "../../../src/components/admin/users-dashboard";
import { LocaleProvider } from "../../../src/utils/locale-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("UsersDashboard", () => {
  it("shows the list and toggles the create form", () => {
    render(
      <LocaleProvider>
        <UsersDashboard users={[]} />
      </LocaleProvider>
    );

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Create a user" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    expect(screen.getByRole("heading", { name: "Create a user" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close form" }));
    expect(screen.queryByRole("heading", { name: "Create a user" })).not.toBeInTheDocument();
  });
});
