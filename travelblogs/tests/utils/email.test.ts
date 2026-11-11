import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn((options: Record<string, unknown>) => {
    void options;
    return { sendMail };
  });
  return { createTransport, sendMail };
});

vi.mock("nodemailer", () => ({ default: { createTransport }, createTransport }));

import {
  clearEmailOutbox,
  describeSendFailure,
  getEmailOutbox,
  sendEmail,
} from "../../src/utils/email";

const SMTP = {
  SMTP_HOST: "smtp.strato.de",
  SMTP_PORT: "465",
  SMTP_USER: "webmaster@dreyer-travels.de",
  SMTP_PASS: "pw-sentinel-8c1f",
  MAIL_FROM: "TravelBlogs <system@blogs.dreyer-travels.de>",
};

const MESSAGE = {
  to: "someone@example.test",
  subject: "Subject",
  text: "Line one\nLine two",
};

const stub = (env: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries({ NEXT_PHASE: undefined, ...env })) {
    vi.stubEnv(key, value);
  }
};

const transportOptions = () => createTransport.mock.calls[0][0];

beforeEach(() => {
  createTransport.mockClear();
  sendMail.mockReset();
  sendMail.mockResolvedValue({ messageId: "<id@test>" });
  clearEmailOutbox();
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearEmailOutbox();
});

describe("sendEmail outside production", () => {
  it.each(["development", "test", "staging"])(
    "puts the message in the outbox and never creates a transport under NODE_ENV=%s, SMTP set or not",
    async (nodeEnv) => {
      stub({ NODE_ENV: nodeEnv, ...SMTP });
      await sendEmail(MESSAGE);
      expect(getEmailOutbox()).toEqual([MESSAGE]);
      expect(createTransport).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  it("returns a copy of the outbox, not the live array", async () => {
    stub({ NODE_ENV: "test" });
    await sendEmail(MESSAGE);
    const copy = getEmailOutbox();
    copy.length = 0;
    expect(getEmailOutbox()).toHaveLength(1);
  });
});

describe("sendEmail in production", () => {
  it("sends over implicit TLS on 465 with verification on and 15 s timeouts", async () => {
    stub({ NODE_ENV: "production", ...SMTP });
    await sendEmail(MESSAGE);

    expect(createTransport).toHaveBeenCalledTimes(1);
    const options = transportOptions();
    expect(options).toMatchObject({
      host: "smtp.strato.de",
      port: 465,
      secure: true,
      requireTLS: false,
      auth: { user: "webmaster@dreyer-travels.de", pass: "pw-sentinel-8c1f" },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 15_000,
    });
    expect(options).not.toHaveProperty("tls");
  });

  it("requires STARTTLS on any other port", async () => {
    stub({ NODE_ENV: "production", ...SMTP, SMTP_PORT: "587" });
    await sendEmail(MESSAGE);
    expect(transportOptions()).toMatchObject({ port: 587, secure: false, requireTLS: true });
    expect(transportOptions()).not.toHaveProperty("tls");
  });

  it("sends exactly { from, to, subject, text } from MAIL_FROM and keeps nothing in the outbox", async () => {
    stub({ NODE_ENV: "production", ...SMTP });
    await sendEmail(MESSAGE);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toStrictEqual({
      from: "TravelBlogs <system@blogs.dreyer-travels.de>",
      to: "someone@example.test",
      subject: "Subject",
      text: "Line one\nLine two",
    });
    expect(getEmailOutbox()).toEqual([]);
  });

  it("rejects when the transport fails, so a caller cannot mistake a lost mail for a sent one", async () => {
    stub({ NODE_ENV: "production", ...SMTP });
    sendMail.mockRejectedValue(
      Object.assign(new Error("Invalid login: 535 Authentication failed"), { code: "EAUTH" }),
    );
    await expect(sendEmail(MESSAGE)).rejects.toMatchObject({ code: "EAUTH" });
  });

  it("rejects without opening a transport when a setting is missing", async () => {
    stub({ NODE_ENV: "production", ...SMTP, SMTP_PASS: undefined });
    await expect(sendEmail(MESSAGE)).rejects.toThrow(/SMTP_PASS/);
    expect(createTransport).not.toHaveBeenCalled();
  });
});

describe("describeSendFailure", () => {
  it("keeps code, responseCode and the message with addresses blanked", () => {
    const error = Object.assign(
      new Error("Can't send mail - all recipients were rejected: 550 5.1.1 <user@example.test>: unknown"),
      { code: "EENVELOPE", responseCode: 550 },
    );
    expect(describeSendFailure(error)).toStrictEqual({
      code: "EENVELOPE",
      responseCode: 550,
      message: "Can't send mail - all recipients were rejected: 550 5.1.1 <<address>>: unknown",
    });
  });

  it("never carries command, response or the envelope", () => {
    const sentinel = "secret-sentinel-77";
    const error = Object.assign(new Error("Message failed"), {
      code: "EMESSAGE",
      command: `RCPT TO:<${sentinel}@example.test>`,
      response: `550 ${sentinel}`,
      envelope: { to: [`${sentinel}@example.test`] },
    });
    const described = describeSendFailure(error);
    expect(Object.keys(described).sort()).toEqual(["code", "message", "responseCode"]);
    expect(JSON.stringify(described)).not.toContain(sentinel);
  });

  it("describes a non-Error throw by its type only", () => {
    expect(describeSendFailure("user@example.test")).toStrictEqual({
      code: undefined,
      responseCode: undefined,
      message: "non-Error thrown (string)",
    });
    expect(describeSendFailure({ code: "X", message: "user@example.test" }).message).toBe(
      "non-Error thrown (object)",
    );
    expect(describeSendFailure(null).message).toBe("non-Error thrown (object)");
    expect(describeSendFailure(undefined).message).toBe("non-Error thrown (undefined)");
  });

  it("ignores code and responseCode of the wrong type", () => {
    const error = Object.assign(new Error("x"), { code: 42, responseCode: "550" });
    expect(describeSendFailure(error)).toStrictEqual({
      code: undefined,
      responseCode: undefined,
      message: "x",
    });
  });
});
