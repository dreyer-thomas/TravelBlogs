-- Story 18.1: the language a user's account mails are written in.
-- Hand-written ALTER instead of Prisma's generated table rebuild: a plain ADD COLUMN keeps every
-- existing row (and its TripAccess foreign keys) untouched and backfills them with 'de'.
-- SQLite stores the PreferredLanguage enum as TEXT.
ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'de';
