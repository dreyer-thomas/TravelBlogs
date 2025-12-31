import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("POST /api/entries", () => {
  let post: (request: Request) => Promise<Response>;
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-entries.db";

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

    const routeModule = await import("../../../src/app/api/entries/route");
    post = routeModule.POST;
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator" });
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an entry with media for an owned trip", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Italy Highlights",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Roman morning",
        coverImageUrl: "/uploads/entries/rome-1.jpg",
        text: "We explored Rome today.",
        mediaUrls: ["/uploads/entries/rome-1.jpg", "/uploads/entries/rome-2.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    const createdEntry = await prisma.entry.findUnique({
      where: { id: body.data.id },
      include: { media: true },
    });

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.tripId).toBe(trip.id);
    expect(body.data.title).toBe("Roman morning");
    expect(body.data.coverImageUrl).toBe("/uploads/entries/rome-1.jpg");
    expect(body.data.text).toBe("We explored Rome today.");
    expect(body.data.media).toHaveLength(2);
    expect(createdEntry?.media.length).toBe(2);
  });

  it("allows setting the entry date explicitly", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Backdated entry",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-05"),
        ownerId: "creator",
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        entryDate: "2025-05-02",
        title: "A day to remember",
        text: "A day to remember.",
        mediaUrls: ["/uploads/entries/rome-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();
    const createdEntry = await prisma.entry.findUnique({
      where: { id: body.data.id },
    });

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.createdAt.startsWith("2025-05-02")).toBe(true);
    expect(createdEntry?.createdAt.toISOString().startsWith("2025-05-02")).toBe(
      true,
    );
  });

  it("creates an entry when photos are embedded in the text", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Inline Photos",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-05"),
        ownerId: "creator",
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Morning walk",
        text: "Morning walk ![Photo](/uploads/trips/cover-1760000000000-abc.jpg)",
        mediaUrls: [],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.tripId).toBe(trip.id);
    expect(body.data.media).toHaveLength(0);
  });

  it("rejects entries for trips not owned by the creator", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "someone-else",
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Should not be allowed",
        text: "Should not be allowed.",
        mediaUrls: ["/uploads/entries/rome-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows contributors with access to create entries", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1" });

    const trip = await prisma.trip.create({
      data: {
        title: "Contributor Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        id: "viewer-1",
        email: "viewer-1@example.com",
        name: "Viewer One",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: "viewer-1",
        canContribute: true,
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Contributor entry",
        text: "Contributor entry text.",
        mediaUrls: ["/uploads/entries/rome-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.tripId).toBe(trip.id);
  });

  it("rejects inactive contributors from creating entries", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1" });

    const trip = await prisma.trip.create({
      data: {
        title: "Inactive contributor",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        id: "viewer-1",
        email: "viewer-1@example.com",
        name: "Viewer One",
        role: "viewer",
        passwordHash: "hash",
        isActive: false,
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: "viewer-1",
        canContribute: true,
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Contributor entry",
        text: "Contributor entry text.",
        mediaUrls: ["/uploads/entries/rome-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: "trip-123",
        title: "No access",
        text: "No access.",
        mediaUrls: ["/uploads/entries/rome-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns validation errors for missing text", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: "trip-123",
        title: "No text",
        text: "",
        mediaUrls: ["/uploads/entries/photo.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for missing title", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: "trip-123",
        title: "",
        text: "Today was a good day.",
        mediaUrls: ["/uploads/entries/photo.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Entry title is required.");
  });

  it("returns validation errors for titles over 80 characters", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: "trip-123",
        title: "a".repeat(81),
        text: "Today was a good day.",
        mediaUrls: ["/uploads/entries/photo.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe(
      "Entry title must be 80 characters or fewer.",
    );
  });

  it("returns validation errors for missing media", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: "trip-123",
        title: "No photos",
        text: "Today was a good day.",
        mediaUrls: [],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for missing trip id", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: "",
        title: "Missing trip",
        text: "Today was a good day.",
        mediaUrls: ["/uploads/entries/photo.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
