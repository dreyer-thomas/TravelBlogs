-- Rebuild User table to add administrator role support and keep constraints aligned
PRAGMA foreign_keys=OFF;

CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK("role" IN ('creator','administrator','viewer')),
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "User_new" ("id", "email", "name", "role", "passwordHash", "isActive", "mustChangePassword", "createdAt", "updatedAt")
SELECT "id", "email", "name", "role", "passwordHash", "isActive", COALESCE("mustChangePassword", false), "createdAt", "updatedAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "User_new" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
