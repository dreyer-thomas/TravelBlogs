export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const { backfillGpsData } = await import("./utils/backfill-gps");
    const { backfillImageCompression } = await import(
      "./utils/backfill-image-compression",
    );
    const { backfillCountryCodes } = await import(
      "./utils/backfill-country-codes",
    );
    const { backfillWeather } = await import("./utils/backfill-weather");

    const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const databasePath = databaseUrl.replace(/^file:/, "");
    const adapter = new PrismaBetterSqlite3({ url: databasePath });
    const prisma = new PrismaClient({ adapter });

    try {
      await backfillGpsData(prisma);
      void backfillImageCompression(prisma)
        .catch((compressionError) => {
          console.error("Image compression backfill failed:", compressionError);
        })
        .then(() => backfillCountryCodes(prisma))
        .catch((countryError) => {
          console.error("Country code backfill failed:", countryError);
        })
        .then(() => backfillWeather(prisma))
        .catch((weatherError) => {
          console.error("Weather backfill failed:", weatherError);
        })
        .finally(() => prisma.$disconnect());
    } catch (error) {
      console.error("GPS backfill failed:", error);
      await prisma.$disconnect();
    }
  }
}
