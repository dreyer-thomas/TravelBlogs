import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-location-search.db";

describe("GET /api/locations/search", () => {
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
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator" });
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      now += 2000;
      return now;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const results = url.includes("Paris")
        ? [
            {
              place_id: 1001,
              lat: "48.8566",
              lon: "2.3522",
              display_name: "Paris, France",
              type: "city",
              importance: 0.9,
            },
            {
              place_id: 1002,
              lat: "33.6609",
              lon: "-95.5555",
              display_name: "Paris, Texas, USA",
              type: "city",
              importance: 0.6,
            },
          ]
        : [
            {
              place_id: 2001,
              lat: "51.5055",
              lon: "-0.0754",
              display_name: "Tower Bridge, London, UK",
              type: "attraction",
              importance: 0.8,
            },
          ];

      return new Response(JSON.stringify(results), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    vi.resetModules();
    const routeModule = await import(
      "../../../src/app/api/locations/search/route"
    );
    get = routeModule.GET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns location search results for valid query", async () => {
    const request = new Request(
      "http://localhost/api/locations/search?query=London%20Tower%20Bridge",
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("latitude");
    expect(body.data[0]).toHaveProperty("longitude");
    expect(body.data[0]).toHaveProperty("displayName");
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);
    const request = new Request(
      "http://localhost/api/locations/search?query=Paris",
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects empty search query", async () => {
    const request = new Request(
      "http://localhost/api/locations/search?query=",
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects missing search query parameter", async () => {
    const request = new Request("http://localhost/api/locations/search", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns multiple results for ambiguous queries", async () => {
    const request = new Request(
      "http://localhost/api/locations/search?query=Paris",
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toBeInstanceOf(Array);
    // Paris is ambiguous - France, Texas, Ontario, etc.
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });
});
