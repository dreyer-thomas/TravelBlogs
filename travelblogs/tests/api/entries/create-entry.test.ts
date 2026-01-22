import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const getToken = vi.hoisted(() => vi.fn());
const reverseGeocode = vi.hoisted(() => vi.fn());
const fetchHistoricalWeather = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

vi.mock("../../../src/utils/reverse-geocode", () => ({
  reverseGeocode,
}));

vi.mock("../../../src/utils/fetch-weather", () => ({
  fetchHistoricalWeather,
}));

describe("POST /api/entries", () => {
  let post: (request: Request) => Promise<Response>;
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-entries.db";
  const waitForWeatherUpdate = async (entryId: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const entry = await prisma.entry.findUnique({ where: { id: entryId } });
      if (
        entry?.weatherCondition !== null ||
        entry?.weatherTemperature !== null ||
        entry?.weatherIconCode !== null
      ) {
        return entry;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return prisma.entry.findUnique({ where: { id: entryId } });
  };

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
    reverseGeocode.mockReset();
    reverseGeocode.mockResolvedValue(null);
    fetchHistoricalWeather.mockReset();
    fetchHistoricalWeather.mockResolvedValue(null);
    await prisma.entryTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an entry with location data", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Location Test Trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
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
        title: "London day",
        text: "Visited Tower Bridge.",
        mediaUrls: ["/uploads/entries/london.jpg"],
        latitude: 51.5055,
        longitude: -0.075406,
        locationName: "Tower Bridge, London, UK",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.location).toEqual({
      latitude: 51.5055,
      longitude: -0.075406,
      label: "Tower Bridge, London, UK",
      countryCode: null,
    });

    const createdEntry = await waitForWeatherUpdate(body.data.id);

    expect(createdEntry?.latitude).toBe(51.5055);
    expect(createdEntry?.longitude).toBe(-0.075406);
    expect(createdEntry?.locationName).toBe("Tower Bridge, London, UK");
  });

  it("persists weather data when weather fetch succeeds", async () => {
    fetchHistoricalWeather.mockResolvedValue({
      condition: "Clear",
      temperature: 22.5,
      iconCode: "0",
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Weather Trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
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
        entryDate: "2025-06-03",
        title: "Clear day",
        text: "Sunny and warm.",
        mediaUrls: ["/uploads/entries/clear.jpg"],
        latitude: 37.7749,
        longitude: -122.4194,
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(fetchHistoricalWeather).toHaveBeenCalledWith(
      37.7749,
      -122.4194,
      expect.any(Date),
    );

    const createdEntry = await waitForWeatherUpdate(body.data.id);

    expect(createdEntry?.weatherCondition).toBe("Clear");
    expect(createdEntry?.weatherTemperature).toBe(22.5);
    expect(createdEntry?.weatherIconCode).toBe("0");
  });

  it("keeps weather fields null when weather fetch fails", async () => {
    fetchHistoricalWeather.mockResolvedValue(null);

    const trip = await prisma.trip.create({
      data: {
        title: "Weather Failure Trip",
        startDate: new Date("2025-06-11"),
        endDate: new Date("2025-06-12"),
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
        title: "Weather unavailable",
        text: "Still saved.",
        mediaUrls: ["/uploads/entries/weather-fail.jpg"],
        latitude: 34.0522,
        longitude: -118.2437,
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();

    const createdEntry = await waitForWeatherUpdate(body.data.id);

    expect(createdEntry?.weatherCondition).toBeNull();
    expect(createdEntry?.weatherTemperature).toBeNull();
    expect(createdEntry?.weatherIconCode).toBeNull();
  });

  it("extracts country code for entries created with coordinates", async () => {
    reverseGeocode.mockResolvedValue("US");

    const trip = await prisma.trip.create({
      data: {
        title: "Country Code Trip",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-10"),
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
        title: "NYC entry",
        text: "Times Square.",
        mediaUrls: ["/uploads/entries/nyc.jpg"],
        latitude: 40.7128,
        longitude: -74.006,
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.location).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
      label: null,
      countryCode: "US",
    });
    expect(reverseGeocode).toHaveBeenCalledWith(40.7128, -74.006);

    const createdEntry = await prisma.entry.findUnique({
      where: { id: body.data.id },
    });

    expect(createdEntry?.countryCode).toBe("US");
  });

  it("creates an entry even when reverse geocoding fails", async () => {
    reverseGeocode.mockResolvedValue(null);

    const trip = await prisma.trip.create({
      data: {
        title: "Geocode Failure Trip",
        startDate: new Date("2025-07-11"),
        endDate: new Date("2025-07-12"),
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
        title: "Null country entry",
        text: "No country available.",
        mediaUrls: ["/uploads/entries/null-country.jpg"],
        latitude: 35.6762,
        longitude: 139.6503,
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.location).toEqual({
      latitude: 35.6762,
      longitude: 139.6503,
      label: null,
      countryCode: null,
    });

    const createdEntry = await prisma.entry.findUnique({
      where: { id: body.data.id },
    });

    expect(createdEntry?.countryCode).toBeNull();
  });

  it("creates an entry with tags", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Tag Trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
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
        title: "Tagged entry",
        text: "Tags for this entry.",
        mediaUrls: ["/uploads/entries/tagged.jpg"],
        tags: ["Beach", "  Sunset "],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.tags).toEqual(["Beach", "Sunset"]);

    const tags = await prisma.tag.findMany({
      where: { tripId: trip.id },
      orderBy: { name: "asc" },
    });
    const entryTags = await prisma.entryTag.findMany({
      where: { entryId: body.data.id },
    });

    expect(tags).toHaveLength(2);
    expect(tags.map((tag) => tag.normalizedName)).toEqual([
      "beach",
      "sunset",
    ]);
    expect(entryTags).toHaveLength(2);
  });

  it("rejects duplicate tags", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Duplicate Tag Trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
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
        title: "Tagged entry",
        text: "Tags for this entry.",
        mediaUrls: ["/uploads/entries/tagged.jpg"],
        tags: ["Paris", "paris"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Tags must be unique.");
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

  it("persists rich text formatting as Tiptap JSON", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Rich Text Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: "center" },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "Italic", marks: [{ type: "italic" }] },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bullet item" }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Numbered item" }],
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
        {
          type: "paragraph",
          attrs: { textAlign: "right" },
          content: [{ type: "text", text: "Aligned text" }],
        },
      ],
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Rich entry",
        text: tiptapJson,
        mediaUrls: ["/uploads/entries/rich-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.text).toBe(tiptapJson);

    const createdEntry = await prisma.entry.findUnique({
      where: { id: body.data.id },
    });
    const parsed = JSON.parse(createdEntry?.text ?? "{}");

    expect(parsed.type).toBe("doc");
    expect(parsed.content.some((node: any) => node.type === "heading")).toBe(
      true,
    );
    expect(parsed.content.some((node: any) => node.type === "bulletList")).toBe(
      true,
    );
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

  it("rejects view-only users from creating entries", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1" });

    const trip = await prisma.trip.create({
      data: {
        title: "Read Only Trip",
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
        canContribute: false,
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Denied entry",
        text: "Denied entry text.",
        mediaUrls: ["/uploads/entries/rome-1.jpg"],
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
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

  it("rejects inactive owners from creating entries", async () => {
    getToken.mockResolvedValue({ sub: "owner-1" });

    await prisma.user.create({
      data: {
        id: "owner-1",
        email: "owner-1@example.com",
        name: "Owner One",
        role: "creator",
        passwordHash: "hash",
        isActive: false,
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Inactive owner trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "owner-1",
      },
    });

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId: trip.id,
        title: "Owner entry",
        text: "Owner entry text.",
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
