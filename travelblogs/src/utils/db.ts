import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  adapter?: PrismaBetterSqlite3;
  databaseUrl?: string;
};

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const databasePath = databaseUrl.replace(/^file:/, "");

const hasMatchingClient =
  globalForPrisma.prisma && globalForPrisma.databaseUrl === databaseUrl;

const adapter =
  hasMatchingClient && globalForPrisma.adapter
    ? globalForPrisma.adapter
    : new PrismaBetterSqlite3({ url: databasePath });

export const prisma = hasMatchingClient
  ? (globalForPrisma.prisma as PrismaClient)
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.adapter = adapter;
  globalForPrisma.databaseUrl = databaseUrl;
}
