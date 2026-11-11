import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-account-token-model.db";

describe("AccountToken model", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    const { PrismaClient } = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new PrismaClient({ adapter });
  });

  beforeEach(async () => {
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createUser = () =>
    prisma.user.create({
      data: { email: "viewer@example.com", name: "Viewer", role: "viewer", passwordHash: "hash" },
    });

  it("deletes a user's tokens with the user", async () => {
    const user = await createUser();
    await prisma.accountToken.create({
      data: { userId: user.id, type: "reset", tokenHash: "a", expiresAt: new Date() },
    });
    await prisma.accountToken.create({
      data: { userId: user.id, type: "invite", tokenHash: "b", expiresAt: new Date() },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.accountToken.count()).toBe(0);
  });

  it("rejects a duplicate tokenHash", async () => {
    const user = await createUser();
    await prisma.accountToken.create({
      data: { userId: user.id, type: "reset", tokenHash: "same", expiresAt: new Date() },
    });

    await expect(
      prisma.accountToken.create({
        data: { userId: user.id, type: "invite", tokenHash: "same", expiresAt: new Date() },
      }),
    ).rejects.toThrow();
  });
});
