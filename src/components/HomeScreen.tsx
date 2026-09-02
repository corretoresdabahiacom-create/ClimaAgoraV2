import { useState } from "react";
import { Loader2, MapPinOff, ShieldCheck, LogOut, HelpCircle } from "lucide-react";
import { useWeather } from "../hooks/useWeather";
import { useStreak } from "../hooks/useStreak";
import { useAchievements } from "../hooks/useAchievements";
import { useFavoriteCities } from "../hooks/useFavoriteCities";
import { useAlertPreferences } from "../hooks/useAlertPreferences";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { FavoriteCitiesBar } from "./FavoriteCitiesBar";
import { AlertPreferencesCard, TriggeredAlertsBanner } from "./AlertPreferences";
import { PushNotificationCard } from "./PushNotificationCard";
import { PushDisabledReminder } from "./PushDisabledReminder";
import { WeatherHero } from "./WeatherHero";
import { HourlyForecast } from "./HourlyForecast";
import { DailyForecast } from "./DailyForecast";
import { AlertsPanel } from "./AlertsPanel";
import { AdCarousel } from "./AdCarousel";
import { UvIndexCard } from "./UvIndexCard";
import { MoonPhaseCard } from "./MoonPhaseCard";
import { ForecastPeriodSelector } from "./ForecastPeriodSelector";
import { NewsPanel } from "./NewsPanel";
import { AirQualityCard } from "./AirQualityCard";
import { SunArcCard } from "./SunArcCard";
import { WindCompassCard } from "./WindCompassCard";
import { TideCard } from "./TideCard";
import { OnThisDayCard } from "./OnThisDayCard";
import { CustomPeriodExplorer } from "./CustomPeriodExplorer";
import { HealthAlertsCard } from "./HealthAlertsCard";
import { WeatherDetailsGrid } from "./WeatherDetailsGrid";
import { BroadcastBanner } from "./BroadcastBanner";
import { LocationConsentScreen } from "./LocationConsentScreen";
import { StreakBadge } from "./StreakBadge";
import { AchievementToast } from "./AchievementToast";
import { ThemeToggle } from "./ThemeToggle";
import { HelpGuideModal } from "./HelpGuideModal";
import { useTheme } from "../hooks/useTheme";
import { getWeatherCodeInfo } from "../lib/weatherCodes";
import { signOut } from "../lib/firebase";
import type { AppUser } from "../types";

interface Props {
  user: AppUser;
  onOpenAdmin: () => void;
}

export function HomeScreen({ user, onOpenAdmin }: Props) {
  const {
    weather,
    alerts,
    loading,
    error,
    searchCity,
    refetch,
    forecastDays,
    changeForecastDays,
    needsLocationConsent,
    requestLocation,
    skipLocationConsent,
  } = useWeather();

  const { favorites, addFavorite, removeFavorite, maxFavorites } = useFavoriteCities(user.uid);
  const { prefs: alertPrefs, triggered: triggeredAlerts, savePreferences } = useAlertPreferences(
    weather ? user.uid : null,
    weather,
  );
  const { status: pushStatus, disabledByUser: pushDisabledByUser, enable: enablePush, disable: disablePush } = usePushNotifications(
    user.uid,
  );

  const codeInfo = weather ? getWeatherCodeInfo(weather.weatherCode) : null;
  const { theme, setTheme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const streak = useStreak(weather ? user.uid : null);
  const { justUnlocked, dismissJustUnlocked } = useAchievements(
    weather ? user.uid : null,
    weather,
    streak?.currentStreak ?? 0,
  );

  return (
    <div className="relative min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <AchievementToast achievementId={justUnlocked} onDismiss={dismissJustUnlocked} />
      {showHelp && <HelpGuideModal onClose={() => setShowHelp(false)} />}
      <div className="w-full max-w-md sm:max-w-2xl md:max-w-4xl mx-auto flex flex-col flex-1 pb-6 pl-5">
        <div
          className="relative flex items-center justify-between gap-1.5 flex-wrap px-6 shrink-0"
          style={{ paddingTop: "max(5rem, env(safe-area-inset-top))" }}
        >
          <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] shrink-0">
            ClimaAgora
          </span>
          <div className="flex items-center gap-1 sm:gap-2.5 flex-wrap justify-end">
            <ThemeToggle theme={theme} onChange={setTheme} />
            <button
              onClick={() => setShowHelp(true)}
              className="glass rounded-full p-1.5 sm:p-2.5 shrink-0"
              aria-label="Como funciona cada card"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </button>
            {streak && <StreakBadge streak={streak.currentStreak} />}
            {user.role === "admin" && (
              <button
                onClick={onOpenAdmin}
                className="glass rounded-full p-1.5 sm:p-2.5 shrink-0"
                aria-label="Painel administrativo"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>
            )}
            <button onClick={() => signOut()} className="glass rounded-full p-1.5 sm:p-2.5 shrink-0" aria-label="Sair">
              <LogOut className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {weather && <BroadcastBanner uid={user.uid} />}
        {weather && pushDisabledByUser && <PushDisabledReminder onReactivate={enablePush} />}

        {weather && (
          <FavoriteCitiesBar
            favorites={favorites}
            currentWeather={weather}
            maxFavorites={maxFavorites}
            onSelect={(lat, lon) => refetch(lat, lon, "search")}
            onAddCurrent={() =>
              addFavorite({
                name: weather.city || "Local",
                state: weather.state,
                lat: weather.lat,
                lon: weather.lon,
              })
            }
            onRemove={removeFavorite}
          />
        )}

      {needsLocationConsent && (
        <LocationConsentScreen onAllow={requestLocation} onSkip={skipLocationConsent} />
      )}

      {!needsLocationConsent && loading && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3 text-white/60">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Localizando você...</p>
        </div>
      )}

      {!loading && error && !weather && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <MapPinOff className="w-8 h-8 text-white/58" />
          <p className="text-sm text-white/70">{error}</p>
          <SearchOnlyBar onSearch={searchCity} />
        </div>
      )}

      {weather && (
        <div className="relative animate-fade-in">
          <WeatherHero weather={weather} onSearch={searchCity} isAdmin={user.role === "admin"} />
          <WeatherDetailsGrid
            precipitation={weather.precipitation}
            visibility={weather.visibility}
            humidity={weather.humidity}
            pressure={weather.pressure}
            feelsLike={weather.feelsLike}
          />
          <HourlyForecast hourly={weather.hourly} />
          <AlertsPanel alerts={alerts} />
          <TriggeredAlertsBanner alerts={triggeredAlerts} />
          <SunArcCard sunrise={weather.sunrise} sunset={weather.sunset} />
          <div className="grid grid-cols-2 gap-3 px-5 mt-5">
            <div className="col-span-1">
              <UvIndexCard uvIndex={weather.uvIndex} />
            </div>
            <div className="col-span-1">
              <AirQualityCard airQuality={weather.airQuality} />
            </div>
          </div>
          <WindCompassCard windSpeed={weather.windSpeed} windDirection={weather.windDirection} />
          <HealthAlertsCard lat={weather.lat} lon={weather.lon} />
          <ForecastPeriodSelector value={forecastDays} onChange={changeForecastDays} />
          <DailyForecast daily={weather.daily} isAdmin={user.role === "admin"} />
          <MoonPhaseCard />
          <OnThisDayCard lat={weather.lat} lon={weather.lon} isAdmin={user.role === "admin"} />
          <CustomPeriodExplorer lat={weather.lat} lon={weather.lon} isAdmin={user.role === "admin"} />
          <TideCard lat={weather.lat} lon={weather.lon} />
          <AlertPreferencesCard prefs={alertPrefs} onSave={savePreferences} />
          <PushNotificationCard status={pushStatus} onEnable={enablePush} onDisable={disablePush} />
          <NewsPanel city={weather.city} state={weather.state} />
          <AdCarousel />
        </div>
      )}
      </div>
    </div>
  );
}

function SearchOnlyBar({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = (e.target as HTMLFormElement).elements.namedItem(
          "city",
        ) as HTMLInputElement;
        if (input.value.trim()) onSearch(input.value.trim());
      }}
      className="glass rounded-2xl flex items-center gap-2 pl-4 pr-1.5 py-1.5 mt-2 w-full max-w-xs"
    >
      <input
        name="city"
        placeholder="Buscar cidade"
        className="bg-transparent outline-none text-sm flex-1 py-1.5 placeholder:text-white/58"
      />
      <button
        type="submit"
        className="bg-white text-slate-900 text-xs font-semibold rounded-xl px-3.5 py-2 shrink-0"
      >
        Ir
      </button>
    </form>
  );
}
