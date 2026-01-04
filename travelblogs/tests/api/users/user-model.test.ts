import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-user-model.db";

describe("User model", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });

    const { PrismaClient } = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a user with required fields and defaults", async () => {
    const user = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    expect(user.email).toBe("viewer@example.com");
    expect(user.name).toBe("Viewer");
    expect(user.role).toBe("viewer");
    expect(user.isActive).toBe(true);
  });

  it("stores administrator role users", async () => {
    const user = await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    expect(user.role).toBe("administrator");
  });
});
