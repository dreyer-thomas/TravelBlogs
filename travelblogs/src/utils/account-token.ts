import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import type { AccountTokenType } from "@prisma/client";

import { prisma } from "./db";

/**
 * Single-use account links (Story 18.2: password reset; Story 18.3: invitations). Only the sha256 of
 * the token is stored - the raw value exists in the mail and in the user's address bar, nowhere else.
 * Nothing in this module logs a token, a hash or a password.
 */
export const ACCOUNT_TOKEN_TTL_MS: Record<AccountTokenType, number> = {
  reset: 60 * 60 * 1000,
  invite: 7 * 24 * 60 * 60 * 1000,
};

/** 32 random bytes as base64url: always 43 characters of `[A-Za-z0-9_-]`. */
const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const PASSWORD_HASH_COST = 12;

/**
 * The link a reset or invitation mail carries. Null when `NEXTAUTH_URL` is unset or not a valid URL,
 * so callers can refuse to send a mail with a broken link.
 */
export const buildSetPasswordUrl = (raw: string): string | null => {
  const base = process.env.NEXTAUTH_URL?.trim();
  if (!base) {
    return null;
  }
  try {
    const url = new URL("/set-password", base);
    url.searchParams.set("token", raw);
    return url.toString();
  } catch {
    return null;
  }
};

export const hashAccountToken = (raw: string) =>
  createHash("sha256").update(raw).digest("hex");

/** The env-managed creator account (`id === "creator"` or `CREATOR_EMAIL`, case-insensitive). */
export const isCreatorAccount = (user: { id: string; email: string }) => {
  if (user.id === "creator") {
    return true;
  }
  const creatorEmail = process.env.CREATOR_EMAIL?.trim().toLowerCase();
  return Boolean(creatorEmail) && user.email.trim().toLowerCase() === creatorEmail;
};

/** Whether an account may receive or use a reset/invite link: it exists, is active and is not the env-managed creator. */
export const isTokenEligibleUser = (
  user: { id: string; email: string; isActive: boolean } | null | undefined,
): user is { id: string; email: string; isActive: boolean } =>
  Boolean(user) && user!.isActive && !isCreatorAccount(user!);

/**
 * An invite token is only meaningful while the invitation is open. A resend that races the
 * invitee's acceptance can create one after the account is set up; it must not work as a reset link.
 */
const isStaleInvite = (type: AccountTokenType, user: { invitationPending: boolean }) =>
  type === "invite" && !user.invitationPending;

/** Creates a token and returns the raw value; only its hash is stored. */
export const createAccountToken = async (userId: string, type: AccountTokenType) => {
  const raw = randomBytes(32).toString("base64url");
  await prisma.accountToken.create({
    data: {
      userId,
      type,
      tokenHash: hashAccountToken(raw),
      expiresAt: new Date(Date.now() + ACCOUNT_TOKEN_TTL_MS[type]),
    },
  });
  return raw;
};

/**
 * For deciding what `/set-password` renders. Not the guard for the password write - between this
 * check and a submit the token can be used in another tab; `redeemAccountToken` checks again atomically.
 */
export const findUsableAccountToken = async (raw: string | null | undefined) => {
  if (typeof raw !== "string" || !RAW_TOKEN_PATTERN.test(raw)) {
    return null;
  }

  const token = await prisma.accountToken.findUnique({
    where: { tokenHash: hashAccountToken(raw) },
    select: {
      id: true,
      userId: true,
      type: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { id: true, email: true, isActive: true, invitationPending: true } },
    },
  });

  if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  if (!isTokenEligibleUser(token.user) || isStaleInvite(token.type, token.user)) {
    return null;
  }

  return { id: token.id, userId: token.userId, type: token.type };
};

class TokenRejected extends Error {}

export type RedeemResult = { ok: true; type: AccountTokenType } | { ok: false };

/**
 * Consumes the token and sets the password in one transaction. The conditional `updateMany` is the
 * check: only the call that flips `usedAt` from null sees `count === 1`, so two tabs racing on one
 * link cannot both win. All other unused tokens of the account (either type) are invalidated too.
 */
export const redeemAccountToken = async (
  raw: string,
  password: string,
): Promise<RedeemResult> => {
  if (!RAW_TOKEN_PATTERN.test(raw)) {
    return { ok: false };
  }

  // Cheap pre-check so a guessed or stale token never costs a bcrypt run. Not the guard - the
  // conditional updateMany below is.
  const tokenHash = hashAccountToken(raw);
  const candidate = await prisma.accountToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!candidate) {
    return { ok: false };
  }

  // Before the transaction: bcrypt at cost 12 takes ~200 ms and would hold the SQLite write lock.
  const passwordHash = await hash(password, PASSWORD_HASH_COST);

  try {
    const type = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.accountToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new TokenRejected();
      }

      const token = await tx.accountToken.findUnique({
        where: { tokenHash },
        select: {
          type: true,
          user: { select: { id: true, email: true, isActive: true, invitationPending: true } },
        },
      });
      if (!token || !isTokenEligibleUser(token.user) || isStaleInvite(token.type, token.user)) {
        throw new TokenRejected();
      }

      await tx.user.update({
        where: { id: token.user.id },
        data: { passwordHash, mustChangePassword: false, invitationPending: false },
      });
      await tx.accountToken.updateMany({
        where: { userId: token.user.id, usedAt: null },
        data: { usedAt: now },
      });

      return token.type;
    });

    return { ok: true, type };
  } catch (error) {
    if (error instanceof TokenRejected) {
      return { ok: false };
    }
    throw error;
  }
};
