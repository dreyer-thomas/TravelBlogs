import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("PATCH /api/entries/[id]", () => {
  let patch: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-update-entry.db";

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

    const routeModule = await import("../../../src/app/api/entries/[id]/route");
    patch = routeModule.PATCH;
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator" });
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates an entry with new text and media", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Italy Highlights",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
      include: { media: true },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated title",
        coverImageUrl: "/uploads/entries/new-1.jpg",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new-1.jpg", "/uploads/entries/new-2.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
      include: { media: true },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.title).toBe("Updated title");
    expect(body.data.coverImageUrl).toBe("/uploads/entries/new-1.jpg");
    expect(body.data.text).toBe("Updated text");
    expect(body.data.media).toHaveLength(2);
    expect(updatedEntry?.text).toBe("Updated text");
    expect(updatedEntry?.media).toHaveLength(2);
  });

  it("updates the entry date when entryDate is provided", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Date update",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
      include: { media: true },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entryDate: "2025-05-05",
        title: "Updated date title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
      include: { media: true },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.createdAt).toContain("2025-05-05");
    expect(updatedEntry?.createdAt.toISOString()).toContain("2025-05-05");
  });

  it("updates text without replacing existing media when mediaUrls is omitted", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Keep media",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/keep.jpg" }],
        },
      },
      include: { media: true },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated text only",
        text: "Updated text only",
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
      include: { media: true },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(updatedEntry?.text).toBe("Updated text only");
    expect(updatedEntry?.media).toHaveLength(1);
  });

  it("accepts inline images when no media array is provided", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Inline Photos",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
      include: { media: true },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated inline",
        text: "Updated ![Photo](/uploads/entries/inline.jpg)",
        mediaUrls: [],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.media).toHaveLength(0);
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/entries/any", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "No access",
        text: "No access.",
        mediaUrls: ["/uploads/entries/photo.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: "any" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects updates for entries not owned by the creator", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "someone-else",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns validation errors for missing text", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Validation",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors when no media is present", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Validation",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Updated text",
        mediaUrls: [],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for empty media URLs", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Validation",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Updated text",
        mediaUrls: [""],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
