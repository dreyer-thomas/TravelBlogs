import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-viewers-notification.db";
const baseUrl = "https://blogs.example.test";

type Handler<P> = (request: Request, context: { params: P }) => Promise<Response>;

describe("POST /api/trips/[id]/viewers trip-access mail", () => {
  let post: Handler<{ id: string }>;
  let patch: Handler<{ id: string; userId: string }>;
  let del: Handler<{ id: string; userId: string }>;
  let prisma: PrismaClient;
  let getEmailOutbox: typeof import("../../../src/utils/email").getEmailOutbox;
  let clearEmailOutbox: typeof import("../../../src/utils/email").clearEmailOutbox;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

  const postViewer = (tripId: string, body: unknown) =>
    post(
      new Request(`http://localhost/api/trips/${tripId}/viewers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: { id: tripId } },
    );

  const createUser = (data: {
    id?: string;
    email: string;
    name: string;
    role?: string;
    preferredLanguage?: "en" | "de";
    invitationPending?: boolean;
  }) =>
    prisma.user.create({
      data: { role: "viewer", passwordHash: "hash", ...data },
    });

  const createTrip = (ownerId: string, title = "Iceland Ring Road") =>
    prisma.trip.create({
      data: {
        title,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId,
      },
    });

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });

    const prismaModule = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({ url: testDatabaseUrl.replace(/^file:/, "") });
    prisma = new prismaModule.PrismaClient({ adapter });

    const routeModule = await import("../../../src/app/api/trips/[id]/viewers/route");
    const userRouteModule = await import(
      "../../../src/app/api/trips/[id]/viewers/[userId]/route"
    );
    const emailModule = await import("../../../src/utils/email");
    post = routeModule.POST;
    patch = userRouteModule.PATCH;
    del = userRouteModule.DELETE;
    getEmailOutbox = emailModule.getEmailOutbox;
    clearEmailOutbox = emailModule.clearEmailOutbox;
  });

  let owner: { id: string };

  beforeEach(async () => {
    getToken.mockReset();
    clearEmailOutbox();
    vi.stubEnv("NEXTAUTH_URL", baseUrl);
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
    owner = await createUser({ email: "owner@example.com", name: "Olivia Owner", role: "creator" });
    getToken.mockResolvedValue({ sub: owner.id, role: "creator" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("mails a German viewer added by userId", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({
      email: "dora@example.com",
      name: "Dora",
      preferredLanguage: "de",
    });

    const response = await postViewer(trip.id, { userId: viewer.id });
    expect(response.status).toBe(201);

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    const [mail] = getEmailOutbox();
    expect(mail.to).toBe("dora@example.com");
    expect(mail.subject).toBe("Olivia Owner hat die Reise „Iceland Ring Road“ mit dir geteilt");
    expect(mail.text).toContain("Hallo Dora,");
    expect(mail.text).toContain("Olivia Owner hat dir Zugriff auf die Reise „Iceland Ring Road“");
    expect(mail.text).toContain("Du kannst die Reise und alle Einträge lesen.");
    expect(mail.text).toContain(`\n${baseUrl}/trips/${trip.id}\n`);
    expect(mail.text).not.toContain("/trips/share/");
    expect(mail.text).not.toContain("token");
    expect(mail.text).not.toContain("Dein Konto ist noch nicht eingerichtet");
  });

  it("mails an English user added by email", async () => {
    const trip = await createTrip(owner.id);
    await createUser({ email: "eve@example.com", name: "Eve", preferredLanguage: "en" });

    const response = await postViewer(trip.id, { email: "EVE@example.com" });
    expect(response.status).toBe(201);

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    const [mail] = getEmailOutbox();
    expect(mail.to).toBe("eve@example.com");
    expect(mail.subject).toBe('Olivia Owner shared the trip "Iceland Ring Road" with you');
    expect(mail.text).toContain("Hello Eve,");
    expect(mail.text).toContain("You can read the trip and all its entries.");
    expect(mail.text).not.toContain("Your account is not set up yet");
  });

  it("creates a contributor in one step and says so in the mail", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({ email: "carl@example.com", name: "Carl", preferredLanguage: "en" });

    const response = await postViewer(trip.id, { userId: viewer.id, canContribute: true });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.canContribute).toBe(true);

    const row = await prisma.tripAccess.findUnique({
      where: { tripId_userId: { tripId: trip.id, userId: viewer.id } },
    });
    expect(row?.canContribute).toBe(true);

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    expect(getEmailOutbox()[0].text).toContain(
      "You can read the trip and add and edit entries as a contributor.",
    );
  });

  it("names the administrator who added the user to someone else's trip", async () => {
    const admin = await createUser({ email: "admin@example.com", name: "Adam Admin", role: "administrator" });
    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });
    const trip = await createTrip(owner.id);
    const viewer = await createUser({ email: "vic@example.com", name: "Vic", preferredLanguage: "en" });

    const response = await postViewer(trip.id, { userId: viewer.id });
    expect(response.status).toBe(201);

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    const [mail] = getEmailOutbox();
    expect(mail.subject.startsWith("Adam Admin ")).toBe(true);
    expect(mail.text).toContain("Adam Admin has given you access");
    expect(mail.text).not.toContain("Olivia Owner");
  });

  it("mails a pending invitee with the extra paragraph", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({
      email: "pia@example.com",
      name: "Pia",
      preferredLanguage: "en",
      invitationPending: true,
    });

    const response = await postViewer(trip.id, { userId: viewer.id });
    expect(response.status).toBe(201);

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    const [mail] = getEmailOutbox();
    expect(mail.text).toContain(
      "Your account is not set up yet: first choose your password with the link in your invitation email, then sign in.",
    );
    expect(mail.text).toContain(`${baseUrl}/trips/${trip.id}`);
  });

  it("mails a German pending invitee with the German extra paragraph", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({
      email: "paul@example.com",
      name: "Paul",
      preferredLanguage: "de",
      invitationPending: true,
    });

    const response = await postViewer(trip.id, { userId: viewer.id });
    expect(response.status).toBe(201);

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    const [mail] = getEmailOutbox();
    expect(mail.text).toContain(
      "Dein Konto ist noch nicht eingerichtet: Wähle zuerst mit dem Link aus deiner Einladungs-E-Mail dein Passwort und melde dich dann an.",
    );
    expect(mail.text).not.toContain("Your account is not set up yet");
  });

  it("sends nothing when the user already had access", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({ email: "ann@example.com", name: "Ann" });
    await prisma.tripAccess.create({ data: { tripId: trip.id, userId: viewer.id } });

    const response = await postViewer(trip.id, { userId: viewer.id, canContribute: true });
    expect(response.status).toBe(200);
    expect((await response.json()).data.canContribute).toBe(false);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("sends nothing on role change or removal", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({ email: "rob@example.com", name: "Rob" });
    await prisma.tripAccess.create({ data: { tripId: trip.id, userId: viewer.id } });

    const patchResponse = await patch(
      new Request(`http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ canContribute: true }),
      }),
      { params: { id: trip.id, userId: viewer.id } },
    );
    expect(patchResponse.status).toBe(200);

    const deleteResponse = await del(
      new Request(`http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`, {
        method: "DELETE",
      }),
      { params: { id: trip.id, userId: viewer.id } },
    );
    expect(deleteResponse.status).toBe(200);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("sends nothing when the owner adds themselves", async () => {
    const trip = await createTrip(owner.id);

    const response = await postViewer(trip.id, { userId: owner.id });
    expect(response.status).toBe(201);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("sends nothing when an administrator adds themselves to someone else's trip", async () => {
    const admin = await createUser({ email: "admin@example.com", name: "Adam Admin", role: "administrator" });
    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });
    const trip = await createTrip(owner.id);

    const response = await postViewer(trip.id, { userId: admin.id });
    expect(response.status).toBe(201);
    expect(
      await prisma.tripAccess.count({ where: { tripId: trip.id, userId: admin.id } }),
    ).toBe(1);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("sends nothing to the creator account", async () => {
    const admin = await createUser({ email: "admin@example.com", name: "Adam Admin", role: "administrator" });
    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });
    const trip = await createTrip(owner.id);
    await createUser({ id: "creator", email: "creator@example.com", name: "Creator", role: "creator" });

    const response = await postViewer(trip.id, { userId: "creator" });
    expect(response.status).toBe(201);
    expect(
      await prisma.tripAccess.count({ where: { tripId: trip.id, userId: "creator" } }),
    ).toBe(1);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("creates the access but sends nothing without NEXTAUTH_URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const trip = await createTrip(owner.id);
    const viewer = await createUser({ email: "nia@example.com", name: "Nia" });

    const response = await postViewer(trip.id, { userId: viewer.id });
    expect(response.status).toBe(201);
    expect(await prisma.tripAccess.count({ where: { tripId: trip.id } })).toBe(1);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "trip-access-notice: NEXTAUTH_URL not set; trip access mail not sent",
    );
  });

  it("rejects a non-boolean canContribute", async () => {
    const trip = await createTrip(owner.id);
    const viewer = await createUser({ email: "val@example.com", name: "Val" });

    const response = await postViewer(trip.id, { userId: viewer.id, canContribute: "yes" });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.tripAccess.count({ where: { tripId: trip.id } })).toBe(0);

    await flush();
    expect(getEmailOutbox()).toHaveLength(0);
  });
});
