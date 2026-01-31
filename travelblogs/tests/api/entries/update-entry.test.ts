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

describe("PATCH /api/entries/[id]", () => {
  let patch: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-update-entry.db";
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

    const routeModule = await import("../../../src/app/api/entries/[id]/route");
    patch = routeModule.PATCH;
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

  it("updates entry location data", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Update Location Trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry without location",
        text: "Some text",
        media: {
          create: [{ url: "/uploads/entries/photo.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Entry without location",
        text: "Some text",
        latitude: 48.8566,
        longitude: 2.3522,
        locationName: "Paris, France",
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.location).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
      label: "Paris, France",
      countryCode: null,
    });

    const updatedEntry = await waitForWeatherUpdate(entry.id);

    expect(updatedEntry?.latitude).toBe(48.8566);
    expect(updatedEntry?.longitude).toBe(2.3522);
    expect(updatedEntry?.locationName).toBe("Paris, France");
  });

  it("updates country code when location changes", async () => {
    reverseGeocode.mockResolvedValue("JP");
    fetchHistoricalWeather.mockResolvedValue({
      condition: "Rain",
      temperature: 18.2,
      iconCode: "61",
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Location update trip",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with location",
        text: "Before update",
        latitude: 35.6586,
        longitude: 139.7454,
        locationName: "Tokyo Tower",
        countryCode: "US",
        media: {
          create: [{ url: "/uploads/entries/tokyo.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: entry.title,
        text: entry.text,
        mediaUrls: ["/uploads/entries/tokyo.jpg"],
        latitude: 35.6762,
        longitude: 139.6503,
        locationName: "Tokyo",
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.location).toEqual({
      latitude: 35.6762,
      longitude: 139.6503,
      label: "Tokyo",
      countryCode: "JP",
    });
    expect(reverseGeocode).toHaveBeenCalledWith(35.6762, 139.6503);
    expect(fetchHistoricalWeather).toHaveBeenCalledWith(
      35.6762,
      139.6503,
      expect.any(Date),
    );

    const updatedEntry = await waitForWeatherUpdate(entry.id);

    expect(updatedEntry?.countryCode).toBe("JP");
    expect(updatedEntry?.weatherCondition).toBe("Rain");
    expect(updatedEntry?.weatherTemperature).toBe(18.2);
    expect(updatedEntry?.weatherIconCode).toBe("61");
  });

  it("clears country code when location is removed", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Location removal trip",
        startDate: new Date("2025-07-03"),
        endDate: new Date("2025-07-04"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with location",
        text: "Before removal",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "NYC",
        countryCode: "US",
        weatherCondition: "Clear",
        weatherTemperature: 24.1,
        weatherIconCode: "0",
        media: {
          create: [{ url: "/uploads/entries/nyc.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: entry.title,
        text: entry.text,
        mediaUrls: ["/uploads/entries/nyc.jpg"],
        latitude: null,
        longitude: null,
        locationName: null,
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.location).toBeNull();
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(fetchHistoricalWeather).not.toHaveBeenCalled();

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(updatedEntry?.countryCode).toBeNull();
    expect(updatedEntry?.weatherCondition).toBeNull();
    expect(updatedEntry?.weatherTemperature).toBeNull();
    expect(updatedEntry?.weatherIconCode).toBeNull();
  });

  it("keeps country code when location is unchanged", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Location unchanged trip",
        startDate: new Date("2025-07-05"),
        endDate: new Date("2025-07-06"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with location",
        text: "No location change",
        latitude: 52.52,
        longitude: 13.405,
        locationName: "Berlin",
        countryCode: "DE",
        weatherCondition: "Partly Cloudy",
        weatherTemperature: 19.3,
        weatherIconCode: "2",
        media: {
          create: [{ url: "/uploads/entries/berlin.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/berlin.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.location).toEqual({
      latitude: 52.52,
      longitude: 13.405,
      label: "Berlin",
      countryCode: "DE",
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(fetchHistoricalWeather).not.toHaveBeenCalled();

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(updatedEntry?.countryCode).toBe("DE");
    expect(updatedEntry?.weatherCondition).toBe("Partly Cloudy");
    expect(updatedEntry?.weatherTemperature).toBe(19.3);
    expect(updatedEntry?.weatherIconCode).toBe("2");
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
        title: "Original title",
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

  it("removes entryImage nodes when media is deleted and GET reflects changes", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Inline Media Cleanup",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Inline Entry",
        text: "Placeholder",
        media: {
          create: [
            { url: "/uploads/entries/keep.jpg" },
            { url: "/uploads/entries/remove.jpg" },
          ],
        },
      },
      include: { media: true },
    });

    const removedMedia = entry.media.find(
      (item) => item.url === "/uploads/entries/remove.jpg",
    );
    if (!removedMedia) {
      throw new Error("Missing media to remove.");
    }

    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Inline" }],
        },
        {
          type: "entryImage",
          attrs: {
            entryMediaId: removedMedia.id,
            src: removedMedia.url,
            alt: "Inline",
          },
        },
      ],
    });

    await prisma.entry.update({
      where: { id: entry.id },
      data: { text: tiptapJson },
    });

    const otherEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Other Entry",
        text: tiptapJson,
        media: {
          create: [{ url: "/uploads/entries/other.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Inline Entry",
        text: tiptapJson,
        mediaUrls: ["/uploads/entries/keep.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    expect(response.status).toBe(200);

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });
    const updatedOther = await prisma.entry.findUnique({
      where: { id: otherEntry.id },
    });

    const updatedJson = JSON.parse(updatedEntry?.text ?? "{}");
    const updatedOtherJson = JSON.parse(updatedOther?.text ?? "{}");
    const entryImages = (updatedJson.content as Array<{ type?: string }> | undefined)?.filter(
      (node) => node.type === "entryImage",
    );
    const otherImages = (updatedOtherJson.content as Array<{ type?: string }> | undefined)?.filter(
      (node) => node.type === "entryImage",
    );

    expect(entryImages).toHaveLength(0);
    expect(otherImages).toHaveLength(0);

    // Verify document structure integrity - paragraph nodes should still exist
    const entryParagraphs = (updatedJson.content as Array<{ type?: string; content?: Array<{ text?: string }> }> | undefined)?.filter(
      (node) => node.type === "paragraph",
    );
    const otherParagraphs = (updatedOtherJson.content as Array<{ type?: string }> | undefined)?.filter(
      (node) => node.type === "paragraph",
    );
    expect(entryParagraphs).toHaveLength(1);
    expect(otherParagraphs).toHaveLength(1);
    expect(entryParagraphs?.[0]?.content?.[0]?.text).toBe("Inline");

    // Verify AC #2: GET endpoint returns entry with removed images
    const routeModule = await import("../../../src/app/api/entries/[id]/route");
    const get = routeModule.GET;

    const getRequest = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "GET",
    });
    const getResponse = await get(getRequest, { params: { id: entry.id } });
    const getBody = await getResponse.json();

    expect(getResponse.status).toBe(200);
    const returnedJson = JSON.parse(getBody.data.text);
    const returnedImages = (returnedJson.content as Array<{ type?: string }> | undefined)?.filter(
      (node) => node.type === "entryImage",
    );
    expect(returnedImages).toHaveLength(0);
  });

  it("handles corrupted JSON gracefully without data loss", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Corrupted JSON Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with corrupted JSON",
        text: '{"type":"doc","content":[corrupt]}', // Invalid JSON
        media: {
          create: [
            { url: "/uploads/entries/keep.jpg" },
            { url: "/uploads/entries/remove.jpg" },
          ],
        },
      },
      include: { media: true },
    });

    const originalText = entry.text;

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Entry with corrupted JSON",
        text: originalText,
        mediaUrls: ["/uploads/entries/keep.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    expect(response.status).toBe(200);

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    // Should preserve original corrupted text rather than lose data
    expect(updatedEntry?.text).toBe(originalText);
  });

  it("removes inline image markdown from plain text entries when media is deleted", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Plain Cleanup Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry With Media",
        text: "Plain text",
        media: {
          create: [
            { url: "/uploads/entries/keep.jpg" },
            { url: "/uploads/entries/remove.jpg" },
          ],
        },
      },
    });

    const otherEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Plain Entry",
        text: "Start ![Alt](/uploads/entries/remove.jpg) End",
        media: {
          create: [{ url: "/uploads/entries/other.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Entry With Media",
        text: "Plain text",
        mediaUrls: ["/uploads/entries/keep.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    expect(response.status).toBe(200);

    const updatedOther = await prisma.entry.findUnique({
      where: { id: otherEntry.id },
    });

    expect(updatedOther?.text).not.toContain("/uploads/entries/remove.jpg");
    // Verify markdown structure is preserved
    expect(updatedOther?.text).toBe("Start  End");
    expect(updatedOther?.text).toContain("Start");
    expect(updatedOther?.text).toContain("End");
  });

  it("updates entry tags when provided", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Tagged Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });
    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Original title",
        text: "Old text",
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
        tags: {
          create: [
            {
              tag: {
                create: {
                  tripId: trip.id,
                  name: "Mountains",
                  normalizedName: "mountains",
                },
              },
            },
          ],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
        tags: ["Lakes", "Forests"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.tags).toEqual(["Forests", "Lakes"]);

    const entryTags = await prisma.entryTag.findMany({
      where: { entryId: entry.id },
      include: { tag: true },
      orderBy: { tag: { name: "asc" } },
    });

    expect(entryTags).toHaveLength(2);
    expect(entryTags.map((item) => item.tag.normalizedName)).toEqual([
      "forests",
      "lakes",
    ]);
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
        title: "Original title",
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
        title: "Original title",
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
        title: "Original title",
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
        title: "Original title",
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
        title: "Updated title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows contributors with access to update entries", async () => {
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

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Original title",
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
        title: "Updated title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.title).toBe("Updated title");
  });

  it("rejects view-only users from updating entries", async () => {
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

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Original title",
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
        title: "Updated title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects inactive contributors from updating entries", async () => {
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

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Original title",
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
        title: "Updated title",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects inactive owners from updating entries", async () => {
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

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Original title",
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
        title: "Updated title",
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
        title: "Original title",
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
        title: "Updated title",
        text: "",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for missing title", async () => {
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
        title: "Original title",
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
        title: "",
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Entry title is required.");
  });

  it("returns validation errors for titles over 80 characters", async () => {
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
        title: "Original title",
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
        title: "a".repeat(81),
        text: "Updated text",
        mediaUrls: ["/uploads/entries/new.jpg"],
      }),
    });

    const response = await patch(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe(
      "Entry title must be 80 characters or fewer.",
    );
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
        title: "Original title",
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
        title: "Updated title",
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
        title: "Original title",
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
        title: "Updated title",
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
