import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";

const testDatabaseUrl = "file:./prisma/test-auth.db";

describe("validateCredentials", () => {
  let prisma: PrismaClient;
  let validateCredentials: (email: string, password: string) => Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.CREATOR_EMAIL = "creator@example.com";
    process.env.CREATOR_PASSWORD = "super-secret";

    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });

    const prismaModule = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new prismaModule.PrismaClient({ adapter });

    const authModule = await import("../../../src/utils/auth");
    validateCredentials = authModule.validateCredentials;
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a creator user when legacy credentials match", async () => {
    const user = await validateCredentials("creator@example.com", "super-secret");
    expect(user).toEqual({
      id: "creator",
      email: "creator@example.com",
      name: "Creator",
      role: "creator",
    });
  });

  it("returns a user when credentials match a stored account", async () => {
    const passwordHash = await hash("Password123!", 12);
    const created = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash,
      },
    });

    const user = await validateCredentials(" Viewer@Example.com ", "Password123!");
    expect(user).toEqual({
      id: created.id,
      email: "viewer@example.com",
      name: "Viewer",
      role: "viewer",
    });
  });

  it("returns null when credentials are invalid", async () => {
    const passwordHash = await hash("Password123!", 12);
    await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash,
      },
    });

    const user = await validateCredentials("viewer@example.com", "wrong");
    expect(user).toBeNull();
  });

  it("returns null when the user is inactive", async () => {
    const passwordHash = await hash("Password123!", 12);
    await prisma.user.create({
      data: {
        email: "inactive@example.com",
        name: "Inactive",
        role: "viewer",
        passwordHash,
        isActive: false,
      },
    });

    const user = await validateCredentials("inactive@example.com", "Password123!");
    expect(user).toBeNull();
  });
});
