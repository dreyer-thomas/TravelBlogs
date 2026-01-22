import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHistoricalWeather, mapWeatherCode } from "../../src/utils/fetch-weather";

const createResponse = (ok: boolean, data: unknown, status = 200) => ({
  ok,
  status,
  json: async () => data,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchHistoricalWeather", () => {
  it("fetches and parses weather data successfully", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
          temperature_2m_max: [22.5],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(48.8566, 2.3522, new Date("2024-01-15"));

    expect(result).toEqual({
      condition: "Clear",
      temperature: 22.5,
      iconCode: "0",
    });
  });

  it("handles legacy weather_code responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weather_code: [3],
          temperature_2m_max: [18.9],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(51.5074, -0.1278, "2024-03-10");

    expect(result).toEqual({
      condition: "Partly Cloudy",
      temperature: 18.9,
      iconCode: "3",
    });
  });

  it("handles Date object input", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [61],
          temperature_2m_max: [15.3],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(52.52, 13.405, new Date("2024-06-20"));

    expect(result).toEqual({
      condition: "Rain",
      temperature: 15.3,
      iconCode: "61",
    });
  });

  it("handles string date input", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [3],
          temperature_2m_max: [18.9],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(51.5074, -0.1278, "2024-03-10");

    expect(result).toEqual({
      condition: "Partly Cloudy",
      temperature: 18.9,
      iconCode: "3",
    });
  });

  it("rounds temperature to 1 decimal place", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
          temperature_2m_max: [22.567],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(40.7128, -74.006, new Date("2024-01-15"));

    expect(result?.temperature).toBe(22.6);
  });

  it("returns null when API response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(false, {}, 500));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(35.6762, 139.6503, new Date());

    expect(result).toBeNull();
  });

  it("returns null when weathercode is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          temperature_2m_max: [20],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(0, 0, new Date());

    expect(result).toBeNull();
  });

  it("returns null when temperature is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(0, 0, new Date());

    expect(result).toBeNull();
  });

  it("returns null when daily data is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(true, {}));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(0, 0, new Date());

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchHistoricalWeather(48.8566, 2.3522, new Date());

    expect(result).toBeNull();
  });

  it("constructs correct API URL with parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
          temperature_2m_max: [20],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await fetchHistoricalWeather(48.8566, 2.3522, "2024-01-15");

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("latitude=48.8566");
    expect(calledUrl).toContain("longitude=2.3522");
    expect(calledUrl).toContain("start_date=2024-01-15");
    expect(calledUrl).toContain("end_date=2024-01-15");
    expect(calledUrl).toContain("daily=weathercode");
    expect(calledUrl).toContain("temperature_2m_max");
    expect(calledUrl).toContain("timezone=auto");
  });
});

describe("mapWeatherCode", () => {
  it("maps code 0 to Clear", () => {
    expect(mapWeatherCode(0)).toBe("Clear");
  });

  it("maps codes 1-3 to Partly Cloudy", () => {
    expect(mapWeatherCode(1)).toBe("Partly Cloudy");
    expect(mapWeatherCode(2)).toBe("Partly Cloudy");
    expect(mapWeatherCode(3)).toBe("Partly Cloudy");
  });

  it("maps codes 45 and 48 to Fog", () => {
    expect(mapWeatherCode(45)).toBe("Fog");
    expect(mapWeatherCode(48)).toBe("Fog");
  });

  it("maps codes 51-67 to Rain", () => {
    expect(mapWeatherCode(51)).toBe("Rain");
    expect(mapWeatherCode(61)).toBe("Rain");
    expect(mapWeatherCode(67)).toBe("Rain");
  });

  it("maps codes 71-77 to Snow", () => {
    expect(mapWeatherCode(71)).toBe("Snow");
    expect(mapWeatherCode(75)).toBe("Snow");
    expect(mapWeatherCode(77)).toBe("Snow");
  });

  it("maps codes 80-99 to Thunderstorm", () => {
    expect(mapWeatherCode(80)).toBe("Thunderstorm");
    expect(mapWeatherCode(95)).toBe("Thunderstorm");
    expect(mapWeatherCode(99)).toBe("Thunderstorm");
  });

  it("maps unknown codes to Unknown", () => {
    expect(mapWeatherCode(100)).toBe("Unknown");
    expect(mapWeatherCode(-1)).toBe("Unknown");
    expect(mapWeatherCode(46)).toBe("Unknown");
  });
});
