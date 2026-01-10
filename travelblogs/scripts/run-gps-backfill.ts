#!/usr/bin/env tsx

import * as dotenv from "dotenv";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { backfillGpsData } from "../src/utils/backfill-gps";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const databasePath = databaseUrl.replace(/^file:/, "");
  const adapter = new PrismaBetterSqlite3({ url: databasePath });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Starting GPS backfill...\n");
    await backfillGpsData(prisma);
    console.log("\nBackfill complete!");
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();
