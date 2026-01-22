export interface WeatherDisplayData {
  icon: string;
  temperature: string;
}

export const getWeatherIcon = (iconCode: string): string => {
  const code = Number.parseInt(iconCode, 10);
  if (Number.isNaN(code)) {
    return "❓";
  }
  if (code === 0) {
    return "☀️";
  }
  if (code >= 1 && code <= 3) {
    return "⛅";
  }
  if (code === 45 || code === 48) {
    return "🌫️";
  }
  if (code >= 51 && code <= 67) {
    return "🌧️";
  }
  if (code >= 71 && code <= 77) {
    return "❄️";
  }
  if (code >= 80 && code <= 99) {
    return "⛈️";
  }
  return "❓";
};

export const formatTemperature = (tempCelsius: number, locale: string): string => {
  const normalizedLocale = locale?.toLowerCase() ?? "";
  const useFahrenheit = normalizedLocale === "en" || normalizedLocale.startsWith("en-");
  const temperature = useFahrenheit
    ? Math.round((tempCelsius * 9) / 5 + 32)
    : Math.round(tempCelsius);
  const unit = useFahrenheit ? "°F" : "°C";
  return `${temperature}${unit}`;
};

export const formatWeatherDisplay = (
  weatherCondition: string | null,
  weatherTemperature: number | null,
  weatherIconCode: string | null,
  locale: string,
): WeatherDisplayData | null => {
  if (!weatherCondition?.trim() || weatherTemperature == null || !weatherIconCode) {
    return null;
  }
  return {
    icon: getWeatherIcon(weatherIconCode),
    temperature: formatTemperature(weatherTemperature, locale),
  };
};
