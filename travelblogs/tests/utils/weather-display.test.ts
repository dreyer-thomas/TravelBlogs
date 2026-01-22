import { describe, expect, it } from "vitest";

import {
  formatTemperature,
  formatWeatherDisplay,
  getWeatherIcon,
} from "../../src/utils/weather-display";

describe("getWeatherIcon", () => {
  it("maps WMO codes to emoji icons", () => {
    expect(getWeatherIcon("0")).toBe("☀️");
    expect(getWeatherIcon("1")).toBe("⛅");
    expect(getWeatherIcon("3")).toBe("⛅");
    expect(getWeatherIcon("45")).toBe("🌫️");
    expect(getWeatherIcon("48")).toBe("🌫️");
    expect(getWeatherIcon("51")).toBe("🌧️");
    expect(getWeatherIcon("67")).toBe("🌧️");
    expect(getWeatherIcon("71")).toBe("❄️");
    expect(getWeatherIcon("77")).toBe("❄️");
    expect(getWeatherIcon("80")).toBe("⛈️");
    expect(getWeatherIcon("99")).toBe("⛈️");
  });

  it("returns a fallback for unknown codes", () => {
    expect(getWeatherIcon("100")).toBe("❓");
    expect(getWeatherIcon("abc")).toBe("❓");
  });
});

describe("formatTemperature", () => {
  it("formats temperatures in Celsius for German locale", () => {
    expect(formatTemperature(24, "de")).toBe("24°C");
  });

  it("formats temperatures in Fahrenheit for English locale", () => {
    expect(formatTemperature(24, "en")).toBe("75°F");
    expect(formatTemperature(0, "en-US")).toBe("32°F");
  });

  it("converts and rounds temperatures accurately", () => {
    expect(formatTemperature(-10, "en-GB")).toBe("14°F");
  });
});

describe("formatWeatherDisplay", () => {
  it("returns icon and temperature when all data exists", () => {
    expect(formatWeatherDisplay("Clear", 24, "0", "de")).toEqual({
      icon: "☀️",
      temperature: "24°C",
    });
  });

  it("returns null when any weather data is missing", () => {
    expect(formatWeatherDisplay(null, 24, "0", "en")).toBeNull();
    expect(formatWeatherDisplay("Clear", null, "0", "en")).toBeNull();
    expect(formatWeatherDisplay("Clear", 24, null, "en")).toBeNull();
  });

  it("returns null when weather condition is empty", () => {
    expect(formatWeatherDisplay("   ", 24, "0", "en")).toBeNull();
  });
});
