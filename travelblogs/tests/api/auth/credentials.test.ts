import { describe, it, expect, beforeEach } from "vitest";

import { validateCredentials } from "../../../src/utils/auth";

describe("validateCredentials", () => {
  beforeEach(() => {
    process.env.CREATOR_EMAIL = "creator@example.com";
    process.env.CREATOR_PASSWORD = "super-secret";
  });

  it("returns a user when credentials match", () => {
    const user = validateCredentials("creator@example.com", "super-secret");
    expect(user).toEqual({
      id: "creator",
      email: "creator@example.com",
      name: "Creator",
    });
  });

  it("returns null when credentials do not match", () => {
    const user = validateCredentials("creator@example.com", "wrong");
    expect(user).toBeNull();
  });
});
