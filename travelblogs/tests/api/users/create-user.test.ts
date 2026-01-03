import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-users.db";

describe("/api/users", () => {
  let post: (request: Request) => Promise<Response>;
  let get: (request: Request) => Promise<Response>;
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

    const prismaModule = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new prismaModule.PrismaClient({ adapter });

    const routeModule = await import("../../../src/app/api/users/route");
    post = routeModule.POST;
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user with valid data", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "new.viewer@example.com",
        name: "New Viewer",
        role: "viewer",
        password: "Password123!",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.email).toBe("new.viewer@example.com");
    expect(body.data.role).toBe("viewer");
    expect(body.data.isActive).toBe(true);

    const created = await prisma.user.findUnique({
      where: { email: "new.viewer@example.com" },
    });
    expect(created).not.toBeNull();
    expect(created?.passwordHash).not.toBe("Password123!");
    expect(created).toMatchObject({ mustChangePassword: true });
  });

  it("lists users for admins", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    await prisma.user.create({
      data: {
        email: "creator@example.com",
        name: "Creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const request = new Request("http://localhost/api/users", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].email).toBe("creator@example.com");
    expect(body.data[0].createdAt).toMatch(/Z$/);
  });

  it("rejects invalid payloads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "not-an-email",
        name: "",
        role: "viewer",
        password: "short",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate email addresses", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    await prisma.user.create({
      data: {
        email: "duplicate@example.com",
        name: "Original",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "duplicate@example.com",
        name: "Duplicate",
        role: "viewer",
        password: "Password123!",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE_USER");
  });

  it("rejects non-admin requests", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "blocked@example.com",
        name: "Blocked",
        role: "viewer",
        password: "Password123!",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "unauth@example.com",
        name: "Unauth",
        role: "viewer",
        password: "Password123!",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
