import { NextResponse } from "next/server";
import { z } from "zod";

import { startPasswordReset } from "../../../utils/password-reset";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
});

const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json({ data: null, error: { code, message } }, { status });

/**
 * Story 18.2. Answers the same thing for every well-formed address and only then - detached, not
 * awaited - looks the account up and sends the mail, so neither the body nor the timing tells a
 * caller whether the address has an account.
 */
export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Enter a valid email address.");
  }

  startPasswordReset(parsed.data.email);

  return NextResponse.json({ data: { accepted: true }, error: null }, { status: 200 });
};
