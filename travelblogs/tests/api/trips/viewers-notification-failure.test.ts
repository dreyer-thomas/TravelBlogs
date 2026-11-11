import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";

const getToken = vi.hoisted(() => vi.fn());
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-viewers-notification-failing.db";

describe("POST /api/trips/[id]/viewers when the mail fails", () => {
  let prisma: PrismaClient;
  let post: (request: Request, context: { params: { id: string } }) => Promise<Response>;

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../../../src/utils/email", async (importOriginal) => {
      const original = await importOriginal<typeof import("../../../src/utils/email")>();
      return {
        ...original,
        sendEmail: sendEmail.mockRejectedValue(
          Object.assign(new Error("550 5.1.1 <added.user@example.com> unknown"), {
            code: "EENVELOPE",
            responseCode: 550,
          }),
        ),
      };
    });
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    ({ prisma } = await import("../../../src/utils/db"));
    ({ POST: post } = await import("../../../src/app/api/trips/[id]/viewers/route"));
  });

  afterAll(async () => {
    vi.doUnmock("../../../src/utils/email");
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await prisma.$disconnect();
  });

  it("still creates the access, answers 201 and logs one safe line", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", name: "Olivia Owner", role: "creator", passwordHash: "hash" },
    });
    const added = await prisma.user.create({
      data: { email: "added.user@example.com", name: "Added Person", role: "viewer", passwordHash: "hash" },
    });
    const trip = await prisma.trip.create({
      data: {
        title: "Secret Iceland Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: owner.id,
      },
    });
    getToken.mockResolvedValue({ sub: owner.id, role: "creator" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await post(
      new Request(`http://localhost/api/trips/${trip.id}/viewers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: added.id }),
      }),
      { params: { id: trip.id } },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data).toEqual({
      id: expect.any(String),
      tripId: trip.id,
      userId: added.id,
      canContribute: false,
      createdAt: expect.any(String),
      user: { id: added.id, name: "Added Person", email: "added.user@example.com" },
    });
    expect(
      await prisma.tripAccess.count({ where: { tripId: trip.id, userId: added.id } }),
    ).toBe(1);

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(consoleError).toHaveBeenCalledTimes(1);
    // The failure must come from the send itself, so the leak checks below cover the SMTP error.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "added.user@example.com" }),
    );
    expect(consoleError.mock.calls[0][0]).toBe("trip-access-notice: trip access mail not sent");
    const logged = JSON.stringify(consoleError.mock.calls[0]);
    for (const secret of [
      "added.user@example.com",
      "Added Person",
      "Olivia Owner",
      "Secret Iceland Trip",
      "/trips/",
      "blogs.example.test",
    ]) {
      expect(logged).not.toContain(secret);
    }
  });
});
