// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UserMenu from "../../src/components/account/user-menu";
import { LocaleProvider } from "../../src/utils/locale-context";

const push = vi.fn();
const signOut = vi.fn();
let pathnameValue = "/trips";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
  usePathname: () => pathnameValue,
}));

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    push.mockReset();
    signOut.mockReset();
    pathnameValue = "/trips";
  });

  it("renders initials from the user name", () => {
    render(
      <LocaleProvider>
        <div className="relative">
          <UserMenu name="Alex Doe" email="alex@example.com" />
        </div>
      </LocaleProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("AD");
  });

  it("opens the menu and navigates to change password", () => {
    render(
      <LocaleProvider>
        <div className="relative">
          <UserMenu name={null} email="sam.bee@example.com" />
        </div>
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(push).toHaveBeenCalledWith(
      "/account/password?callbackUrl=%2Ftrips",
    );
  });

  it("navigates to user manual when selecting User Manual", () => {
    render(
      <LocaleProvider>
        <div className="relative">
          <UserMenu name="Chris" email="chris@example.com" />
        </div>
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "User Manual" }));

    expect(push).toHaveBeenCalledWith("/manual");
  });

  it("signs out when selecting check out", async () => {
    signOut.mockResolvedValue(undefined);

    render(
      <LocaleProvider>
        <div className="relative">
          <UserMenu name="Jane" email="jane@example.com" />
        </div>
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "Check out" }));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/sign-in" });
  });
});
