import nodemailer from "nodemailer";

import { readSmtpConfig, usesSmtp } from "./smtp-config";

/**
 * A plain-text account mail (Story 18.1). Deliberately no HTML part and no attachments: the account
 * mails of Epic 18 are a few lines of text with a link.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

/** Anything shaped like a mail address. nodemailer's messages quote the server's reply, recipient included. */
const ADDRESS_PATTERN = /[^\s<>"',;:()[\]]+@[^\s<>"',;:()[\]]+/g;

/**
 * What an SMTP failure is allowed to put in the journal: nodemailer's error code (`EAUTH`,
 * `ECONNECTION`, `ETIMEDOUT`...), the server's reply code and the message with any address blanked -
 * never the error object, whose `command`, `response` and envelope fields are not ours to vouch for,
 * and never a non-`Error` throw, which could be anything.
 */
export const describeSendFailure = (error: unknown) => {
  const fields = (typeof error === "object" && error !== null ? error : {}) as Record<
    string,
    unknown
  >;
  return {
    code: typeof fields.code === "string" ? fields.code : undefined,
    responseCode: typeof fields.responseCode === "number" ? fields.responseCode : undefined,
    message:
      error instanceof Error
        ? error.message.replace(ADDRESS_PATTERN, "<address>")
        : `non-Error thrown (${typeof error})`,
  };
};

/**
 * Connection, greeting and socket inactivity, each - per phase, not a cap on the whole send. They bound
 * how long a stuck send can hold a request or a background task.
 */
const SMTP_TIMEOUT_MS = 15_000;

const globalForEmail = globalThis as unknown as {
  emailOutbox?: EmailMessage[];
};

const outbox = globalForEmail.emailOutbox ?? [];

// Pinned to globalThis outside production so that dev hot reloads and test module resets keep one
// outbox; production never fills it.
if (process.env.NODE_ENV !== "production") {
  globalForEmail.emailOutbox = outbox;
}

/**
 * Production sends over SMTP; everywhere else the message goes into the in-memory outbox and no
 * connection is made, whatever SMTP variables happen to be set.
 *
 * **Throws when the mail is not sent.** Deciding what a failure means is the caller's job - e.g. a
 * password-reset route logs `describeSendFailure(error)` and still answers success - but a swallowed
 * failure in here would lose mail silently.
 *
 * A transport per call, not a cached one: the volume is a handful of mails a year, and a cached
 * transport would keep settings from before a config change.
 */
export const sendEmail = async (message: EmailMessage) => {
  if (!usesSmtp()) {
    outbox.push(message);
    return;
  }

  const config = readSmtpConfig();
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // Implicit TLS on 465; anywhere else STARTTLS is mandatory, or nodemailer would carry on in clear
    // text (AUTH included) if the server did not offer it. Certificate verification is left on.
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

  await transport.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
};

export const getEmailOutbox = () => [...outbox];

export const clearEmailOutbox = () => {
  outbox.length = 0;
};
