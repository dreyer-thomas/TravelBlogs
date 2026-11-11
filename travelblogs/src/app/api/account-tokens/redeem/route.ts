import { NextResponse } from "next/server";
import { z } from "zod";

import { redeemAccountToken } from "../../../../utils/account-token";

export const runtime = "nodejs";

const redeemSchema = z.object({
  token: z.string().min(1, "Token is required."),
  // `.trim()` mirrors the change-password route, so a password set here signs in like one set there.
  password: z.string().trim().min(8, "Password must be at least 8 characters."),
});

const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json({ data: null, error: { code, message } }, { status });

const formatValidationError = (error: z.ZodError) => {
  const messages = Array.from(
    new Set(error.issues.map((issue) => issue.message).filter(Boolean)),
  );
  return messages.length > 0 ? messages.join(" ") : "Password details are invalid.";
};

/**
 * Sets a password from a reset (18.2) or invitation (18.3) link. The token travels in the body, never
 * the URL path. No session is created - the user signs in afterwards.
 */
export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", formatValidationError(parsed.error));
  }

  try {
    const result = await redeemAccountToken(parsed.data.token, parsed.data.password);
    if (!result.ok) {
      return jsonError(400, "TOKEN_INVALID", "This link is no longer valid.");
    }
    return NextResponse.json({ data: { type: result.type }, error: null }, { status: 200 });
  } catch (error) {
    // Fixed text plus the error code only: the error could carry query parameters (the token).
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;
    console.error("account-token: redeem failed", { code });
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to set password.");
  }
};
