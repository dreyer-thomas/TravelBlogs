-- Story 18.3: accounts created by invitation cannot sign in until the invitee sets a password.
-- Hand-written ALTER instead of Prisma's table rebuild: existing rows (and their TripAccess /
-- AccountToken foreign keys) stay untouched and read false.
ALTER TABLE "User" ADD COLUMN "invitationPending" BOOLEAN NOT NULL DEFAULT false;
