-- CreateTable
CREATE TABLE "TripShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripShareLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TripShareLink_tripId_key" ON "TripShareLink"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripShareLink_token_key" ON "TripShareLink"("token");
