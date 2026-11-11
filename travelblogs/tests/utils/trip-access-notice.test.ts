import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());

vi.mock("../../src/utils/db", () => ({
  prisma: { user: { findUnique } },
}));

import { clearEmailOutbox, getEmailOutbox } from "../../src/utils/email";
import {
  buildTripUrl,
  sendTripAccessNotice,
  shouldNotifyTripAccess,
  startTripAccessNotice,
} from "../../src/utils/trip-access-notice";

const recipient = {
  id: "user-1",
  email: "added.user@example.com",
  name: "Added User",
  preferredLanguage: "en" as const,
  invitationPending: false,
};

describe("buildTripUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when NEXTAUTH_URL is unset, blank or invalid", () => {
    vi.stubEnv("NEXTAUTH_URL", undefined as unknown as string);
    expect(buildTripUrl("trip-1")).toBeNull();
    vi.stubEnv("NEXTAUTH_URL", "   ");
    expect(buildTripUrl("trip-1")).toBeNull();
    vi.stubEnv("NEXTAUTH_URL", "not a url");
    expect(buildTripUrl("trip-1")).toBeNull();
  });

  it("builds an absolute trip URL from the host, ignoring a trailing slash or path", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test/");
    expect(buildTripUrl("trip-1")).toBe("https://blogs.example.test/trips/trip-1");
    vi.stubEnv("NEXTAUTH_URL", " https://blogs.example.test/some/path ");
    expect(buildTripUrl("trip-1")).toBe("https://blogs.example.test/trips/trip-1");
  });

  it("encodes the trip id", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    expect(buildTripUrl("a/b?c")).toBe("https://blogs.example.test/trips/a%2Fb%3Fc");
  });
});

describe("shouldNotifyTripAccess", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips the acting user, the trip owner and the creator account", () => {
    vi.stubEnv("CREATOR_EMAIL", "Owner@Example.com");
    const base = { actorId: "actor", ownerId: "owner" };
    expect(shouldNotifyTripAccess({ ...base, recipient: { id: "actor", email: "a@x.test" } })).toBe(false);
    expect(shouldNotifyTripAccess({ ...base, recipient: { id: "owner", email: "o@x.test" } })).toBe(false);
    expect(shouldNotifyTripAccess({ ...base, recipient: { id: "creator", email: "c@x.test" } })).toBe(false);
    expect(
      shouldNotifyTripAccess({ ...base, recipient: { id: "u2", email: " owner@EXAMPLE.com" } }),
    ).toBe(false);
    expect(shouldNotifyTripAccess({ ...base, recipient: { id: "u3", email: "u3@x.test" } })).toBe(true);
  });
});

describe("sendTripAccessNotice", () => {
  beforeEach(() => {
    clearEmailOutbox();
    findUnique.mockReset();
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("keeps line breaks out of the subject", async () => {
    findUnique.mockResolvedValue({ name: "Actor" });
    await sendTripAccessNotice({
      tripId: "trip-1",
      tripTitle: "Iceland\r\n  Bcc: evil@example.com",
      actorId: "actor",
      recipient,
      canContribute: false,
    });
    const [mail] = getEmailOutbox();
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.subject).toBe('Actor shared the trip "Iceland Bcc: evil@example.com" with you');
  });

  it("renders $& and placeholder-looking text in names and titles literally", async () => {
    findUnique.mockResolvedValue({ name: "Act $& or {{url}}" });
    await sendTripAccessNotice({
      tripId: "trip-1",
      tripTitle: "Trip $' {{pending}}",
      actorId: "actor",
      recipient: { ...recipient, name: "Name $1 {{trip}}" },
      canContribute: false,
    });
    const [mail] = getEmailOutbox();
    expect(mail.text).toContain("Hello Name $1 {{trip}},");
    expect(mail.text).toContain(
      'Act $& or {{url}} has given you access to the trip "Trip $\' {{pending}}" on TravelBlogs.',
    );
    expect(mail.subject).toContain("Act $& or {{url}}");
    expect(mail.text.match(/https:\/\/blogs\.example\.test/g)).toHaveLength(1);
  });

  it("falls back to 'someone' when the actor has no user row", async () => {
    findUnique.mockResolvedValue(null);
    await sendTripAccessNotice({
      tripId: "trip-1",
      tripTitle: "Trip",
      actorId: "creator",
      recipient: { ...recipient, preferredLanguage: "de" },
      canContribute: true,
    });
    const [mail] = getEmailOutbox();
    expect(mail.subject).toBe("Jemand hat die Reise „Trip“ mit dir geteilt");
    expect(mail.text).toContain("Du kannst die Reise lesen und Einträge hinzufügen und bearbeiten.");
  });

  it("logs the fixed line and sends nothing without NEXTAUTH_URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendTripAccessNotice({
      tripId: "trip-1",
      tripTitle: "Trip",
      actorId: "actor",
      recipient,
      canContribute: false,
    });
    expect(getEmailOutbox()).toHaveLength(0);
    expect(findUnique).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "trip-access-notice: NEXTAUTH_URL not set; trip access mail not sent",
    );
  });

  it("startTripAccessNotice turns a failure into one safe log line", async () => {
    findUnique.mockRejectedValue(new Error("db down for added.user@example.com"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await startTripAccessNotice({
      tripId: "trip-1",
      tripTitle: "Secret Trip",
      actorId: "actor",
      recipient,
      canContribute: false,
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0][0]).toBe("trip-access-notice: trip access mail not sent");
    const logged = JSON.stringify(consoleError.mock.calls[0]);
    expect(logged).not.toContain("added.user@example.com");
    expect(logged).not.toContain("Secret Trip");
  });
});
