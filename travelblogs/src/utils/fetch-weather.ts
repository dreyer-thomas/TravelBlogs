/**
 * Utility for fetching historical weather data from Open-Meteo API
 * API: https://archive-api.open-meteo.com/v1/archive
 */

export interface WeatherData {
  condition: string;      // Human-readable condition (e.g., "Clear", "Rain")
  temperature: number;    // Temperature in Celsius
  iconCode: string;       // WMO weather code as string (e.g., "0", "61")
}

/**
 * Map WMO weather codes to human-readable conditions
 * Reference: https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM
 */
export function mapWeatherCode(wmoCode: number): string {
  if (wmoCode === 0) return 'Clear';
  if (wmoCode >= 1 && wmoCode <= 3) return 'Partly Cloudy';
  if (wmoCode === 45 || wmoCode === 48) return 'Fog';
  if (wmoCode >= 51 && wmoCode <= 67) return 'Rain';
  if (wmoCode >= 71 && wmoCode <= 77) return 'Snow';
  if (wmoCode >= 80 && wmoCode <= 99) return 'Thunderstorm';
  return 'Unknown';
}

/**
 * Fetch historical weather data for a specific date and location
 *
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param date - Date for weather data (YYYY-MM-DD format or Date object)
 * @returns WeatherData object or null if unavailable
 */
export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  date: string | Date
): Promise<WeatherData | null> {
  try {
    // Convert Date to YYYY-MM-DD string if needed
    const dateStr = typeof date === 'string'
      ? date
      : date.toISOString().split('T')[0];

    // Open-Meteo Archive API endpoint
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);
    url.searchParams.set('daily', 'weathercode,temperature_2m_max');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.warn(
        `Failed to fetch weather for ${latitude},${longitude} on ${dateStr}: ${response.status}`
      );
      return null;
    }

    const data = await response.json();

    // Extract daily values
    const weatherCode =
      data.daily?.weathercode?.[0] ?? data.daily?.weather_code?.[0];
    const temperature = data.daily?.temperature_2m_max?.[0];

    // Validate data availability
    if (weatherCode === undefined || temperature === undefined) {
      console.warn(
        `Incomplete weather data for ${latitude},${longitude} on ${dateStr}`
      );
      return null;
    }

    return {
      condition: mapWeatherCode(weatherCode),
      temperature: Math.round(temperature * 10) / 10, // Round to 1 decimal
      iconCode: weatherCode.toString(),
    };
  } catch (error) {
    console.error(
      `Error fetching weather for ${latitude},${longitude}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}
