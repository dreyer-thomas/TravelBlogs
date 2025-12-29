// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UsersDashboard from "../../../src/components/admin/users-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("UsersDashboard", () => {
  it("shows the list and toggles the create form", () => {
    render(<UsersDashboard users={[]} />);

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(screen.queryByText("Create a user")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    expect(screen.getByText("Create a user")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close form" }));
    expect(screen.queryByText("Create a user")).not.toBeInTheDocument();
  });
});
