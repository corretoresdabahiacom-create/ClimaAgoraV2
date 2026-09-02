import { useCallback, useRef, useState } from "react";
import type { WeatherData, InmetAlert } from "../types";

interface WeatherState {
  weather: WeatherData | null;
  alerts: InmetAlert[];
  loading: boolean;
  error: string | null;
  locationSource: "gps" | "search" | null;
  forecastDays: number;
  needsLocationConsent: boolean;
}

export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    weather: null,
    alerts: [],
    loading: false,
    error: null,
    locationSource: null,
    forecastDays: 7,
    needsLocationConsent: true,
  });
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const forecastDaysRef = useRef(7);

  const fetchByCoords = useCallback(
    async (lat: number, lon: number, source: "gps" | "search", days?: number) => {
      lastCoordsRef.current = { lat, lon };
      const effectiveDays = days ?? forecastDaysRef.current;
      forecastDaysRef.current = effectiveDays;
      setState((s) => ({ ...s, loading: true, error: null, forecastDays: effectiveDays }));
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&days=${effectiveDays}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Erro ${res.status} ao buscar clima.`);
        }
        const weather: WeatherData = await res.json();

        // Alertas são buscados separadamente e nunca bloqueiam a tela de
        // clima principal — se o INMET falhar, mostramos o clima mesmo
        // assim e só omitimos a seção de alertas.
        let alerts: InmetAlert[] = [];
        try {
          const alertsRes = await fetch(
            `/api/alerts?lat=${lat}&lon=${lon}`,
          );
          if (alertsRes.ok) {
            const body = await alertsRes.json();
            alerts = body.alerts || [];
          }
        } catch {
          // Falha silenciosa apenas para alertas — não é crítico o
          // suficiente para bloquear a tela principal de clima.
        }

        setState({
          weather,
          alerts,
          loading: false,
          error: null,
          locationSource: source,
          forecastDays: effectiveDays,
          needsLocationConsent: false,
        });
      } catch (err: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err?.message || "Não foi possível carregar o clima.",
        }));
      }
    },
    [],
  );

  const searchCity = useCallback(
    async (query: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) {
        setState((s) => ({
          ...s,
          loading: false,
          error: "Cidade não encontrada. Tente outro nome.",
        }));
        return;
      }
      const loc = await res.json();
      await fetchByCoords(loc.lat, loc.lon, "search");
    },
    [fetchByCoords],
  );

  const changeForecastDays = useCallback(
    (days: number) => {
      const coords = lastCoordsRef.current;
      if (!coords) return;
      fetchByCoords(coords.lat, coords.lon, state.locationSource ?? "search", days);
    },
    [fetchByCoords, state.locationSource],
  );

  // Mensagem específica por tipo de falha de geolocalização — "erro genérico"
  // não ajuda o usuário a saber se o problema é permissão bloqueada, GPS
  // indisponível, ou apenas demora. Cada código do GeolocationPositionError
  // tem uma causa e uma ação diferente.
  function geolocationErrorMessage(err: GeolocationPositionError): string {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return "Você bloqueou o acesso à localização para este site. Habilite a permissão de localização nas configurações do navegador (ícone de cadeado/informações do site na barra de endereço) e tente novamente, ou busque sua cidade manualmente.";
      case err.POSITION_UNAVAILABLE:
        return "Não foi possível determinar sua localização agora (sinal de GPS ou rede indisponível). Busque sua cidade manualmente.";
      case err.TIMEOUT:
        return "A busca pela sua localização demorou demais. Tente novamente ou busque sua cidade manualmente.";
      default:
        return "Não foi possível obter sua localização. Busque uma cidade para continuar.";
    }
  }

  const requestLocation = useCallback(() => {
    setState((s) => ({ ...s, needsLocationConsent: false, loading: true, error: null }));
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        loading: false,
        error:
          "Geolocalização não suportada neste navegador. Busque uma cidade manualmente.",
      }));
      return;
    }

    // Primeira tentativa: alta precisão (GPS real), ideal para celular.
    // Navegadores de computador (Chrome, Firefox, Edge, Opera, Brave) quase
    // sempre não têm chip de GPS e dependem só de rede Wi-Fi/IP — pedir alta
    // precisão nesses casos costuma falhar ou estourar o tempo limite.
    // Por isso, qualquer falha que NÃO seja permissão explicitamente negada
    // aciona automaticamente uma segunda tentativa mais tolerante (sem exigir
    // GPS, com prazo maior), em vez de desistir na primeira falha.
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude, "gps"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState((s) => ({ ...s, loading: false, error: geolocationErrorMessage(err) }));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude, "gps"),
          (err2) => {
            setState((s) => ({ ...s, loading: false, error: geolocationErrorMessage(err2) }));
          },
          { timeout: 20000, maximumAge: 300000, enableHighAccuracy: false },
        );
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: true },
    );
  }, [fetchByCoords]);

  const skipLocationConsent = useCallback(() => {
    setState((s) => ({
      ...s,
      needsLocationConsent: false,
      error: "Busque sua cidade para ver o clima.",
    }));
  }, []);

  return {
    ...state,
    searchCity,
    refetch: fetchByCoords,
    changeForecastDays,
    requestLocation,
    skipLocationConsent,
  };
}
