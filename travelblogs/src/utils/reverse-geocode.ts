const requestDelayMs = 1000;
const maxAttempts = 3;
const backoffBaseMs = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", latitude.toString());
  url.searchParams.set("lon", longitude.toString());
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await sleep(requestDelayMs);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "TravelBlogs/1.0",
        },
      });

      if (!response.ok) {
        console.warn(
          `Nominatim reverse geocoding failed: ${response.status}`,
        );
      } else {
        const data = await response.json();
        const countryCode = data?.address?.country_code;

        if (!countryCode || typeof countryCode !== "string") {
          console.warn("No country code in Nominatim response", {
            latitude,
            longitude,
          });
          return null;
        }

        return countryCode.toUpperCase();
      }
    } catch (error) {
      console.error("Reverse geocoding error", error);
    }

    if (attempt < maxAttempts) {
      const backoffMs = backoffBaseMs * 2 ** (attempt - 1);
      await sleep(backoffMs);
    }
  }

  return null;
}
