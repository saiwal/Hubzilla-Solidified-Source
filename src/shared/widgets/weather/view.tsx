import { createResource, Show } from "solid-js";

const ICONS: Record<number, string> = {
  113: "☀️",
  116: "⛅",
  119: "☁️",
  122: "☁️",
  143: "🌫",
  176: "🌦",
  179: "🌨",
  182: "🌧",
  185: "🌧",
  200: "⛈",
  227: "❄️",
  230: "❄️",
  248: "🌫",
  260: "🌫",
  263: "🌦",
  266: "🌦",
  281: "🌧",
  284: "🌧",
  293: "🌧",
  296: "🌧",
  299: "🌧",
  302: "🌧",
  305: "🌧",
  308: "🌧",
  311: "🌧",
  314: "🌧",
  317: "🌨",
  320: "🌨",
  323: "❄️",
  326: "❄️",
  329: "❄️",
  332: "❄️",
  335: "❄️",
  338: "❄️",
  350: "🌧",
  353: "🌦",
  356: "🌧",
  359: "🌧",
  362: "🌨",
  365: "🌨",
  368: "🌨",
  371: "❄️",
  374: "🌨",
  377: "🌨",
  386: "⛈",
  389: "⛈",
  392: "⛈",
  395: "❄️",
};

type WeatherData = {
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  desc: string;
  icon: string;
  location: string;
};
async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch(`/weather`);
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();
  const current = data.current_condition[0];
  const area = data.nearest_area[0];
  const city = area.areaName[0].value;
  const country = area.country[0].value;
  const code = Number(current.weatherCode);

  return {
    temp: Math.round(Number(current.temp_C)),
    feels: Math.round(Number(current.FeelsLikeC)),
    humidity: Math.round(Number(current.humidity)),
    wind: Math.round(Number(current.windspeedKmph)),
    desc: current.weatherDesc[0].value,
    icon: ICONS[code] ?? "🌡",
    location: [city, country].filter(Boolean).join(", "),
  };
}
export default function WeatherWidget() {
  const [data] = createResource(fetchWeather);

  return (
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Weather
      </p>

      <Show when={data.loading}>
        <p class="text-xs text-gray-400 text-center py-2">Locating...</p>
      </Show>

      <Show when={data.error}>
        <p class="text-xs text-gray-400 text-center py-2">
          {data.error?.message ?? "Weather unavailable"}
        </p>
      </Show>
      <Show when={data()}>
        {(d) => (
          <>
            <div class="flex justify-between items-start">
              <div>
                <p class="text-3xl font-medium text-gray-900 dark:text-gray-100 leading-none">
                  {d().temp}°C
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {d().desc}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{d().location}</p>
              </div>
              <span class="text-4xl leading-none">{d().icon}</span>
            </div>

            <div class="flex justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div class="text-center">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {d().feels}°C
                </p>
                <p class="text-xs text-gray-400 mt-0.5">feels like</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {d().humidity}%
                </p>
                <p class="text-xs text-gray-400 mt-0.5">humidity</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {d().wind} km/h
                </p>
                <p class="text-xs text-gray-400 mt-0.5">wind</p>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}
