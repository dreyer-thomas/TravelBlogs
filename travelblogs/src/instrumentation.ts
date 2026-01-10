export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const { backfillGpsData } = await import("./utils/backfill-gps");

    const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const databasePath = databaseUrl.replace(/^file:/, "");
    const adapter = new PrismaBetterSqlite3({ url: databasePath });
    const prisma = new PrismaClient({ adapter });

    try {
      await backfillGpsData(prisma);
    } catch (error) {
      console.error("GPS backfill failed:", error);
    } finally {
      await prisma.$disconnect();
    }
  }
}
