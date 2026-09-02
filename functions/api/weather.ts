// GET /api/weather?lat=X&lon=Y
// INMET é a fonte primária para condição/máx/mín diário (é o órgão
// meteorológico oficial do Brasil). Open-Meteo é usado como consenso e
// para tudo que o INMET não cobre em sua API pública: temperatura atual
// exata, hora a hora, UV, qualidade do ar, nascer/pôr do sol. Isso
// acontece nos bastidores — a resposta final não expõe qual fonte gerou
// cada campo, mas cada valor vem de uma chamada real, nunca fabricado.

import { resolveIbgeCode } from "../_shared/ibgeMunicipios";
import { fetchInmetForecast } from "../_shared/inmetForecast";
import { getGoogleAccessToken, getProjectId } from "../_shared/googleAuth";
import { recordSourceStatus } from "../_shared/systemStatus";

interface Env {
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
}

const NOMINATIM_USER_AGENT = "ClimaAgora/2.0 (contato via app; uso nao comercial)";

async function reverseGeocode(lat: number, lon: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR&zoom=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const addr = data?.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const state = addr.state || "";
    const country = addr.country || "Brasil";
    return { city, state, country };
  } catch {
    return null;
  }
}

async function fetchAirQuality(lat: number, lon: number) {
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=us_aqi,european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();
    const c = data?.current;
    if (!c) return null;
    return {
      usAqi: c.us_aqi ?? null,
      europeanAqi: c.european_aqi ?? null,
      pm2_5: c.pm2_5 ?? null,
      pm10: c.pm10 ?? null,
      no2: c.nitrogen_dioxide ?? null,
      o3: c.ozone ?? null,
      so2: c.sulphur_dioxide ?? null,
      co: c.carbon_monoxide ?? null,
    };
  } catch {
    return null;
  }
}

// Dispara o registro de status em segundo plano (context.waitUntil) —
// a resposta ao usuário já foi ou está sendo montada e NUNCA espera por
// isso. Se a Service Account não estiver configurada neste ambiente,
// simplesmente não monitora (nunca quebra a rota principal por causa
// disso).
function recordStatusInBackground(
  context: { env: Env; waitUntil: (p: Promise<any>) => void },
  source: "inmet" | "open-meteo",
  isUp: boolean,
) {
  if (!context.env.FIREBASE_SERVICE_ACCOUNT_JSON) return;
  const task = (async () => {
    try {
      const projectId = getProjectId(context.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
      const accessToken = await getGoogleAccessToken(context.env.FIREBASE_SERVICE_ACCOUNT_JSON!, [
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/firebase.messaging",
      ]);
      await recordSourceStatus(accessToken, projectId, source, isUp);
    } catch {
      // Monitoramento nunca deve gerar erro visível nem afetar nada.
    }
  })();
  context.waitUntil(task);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  // Open-Meteo suporta previsão real de até 16 dias no plano gratuito —
  // limitamos a esse teto para nunca pedir (e fingir ter) mais dias do
  // que a fonte de fato fornece.
  const requestedDays = parseInt(url.searchParams.get("days") || "7", 10);
  const forecastDays = Math.min(16, Math.max(1, isNaN(requestedDays) ? 8 : requestedDays));
  const debugMode = url.searchParams.get("debug") === "1";

  if (isNaN(lat) || isNaN(lon)) {
    return new Response(
      JSON.stringify({ error: "Parâmetros 'lat' e 'lon' são obrigatórios e devem ser numéricos." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,precipitation,visibility` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,uv_index` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset` +
    `&timezone=auto&forecast_days=${forecastDays}`;

  let forecast: any;
  try {
    const res = await fetch(forecastUrl);
    if (!res.ok) {
      recordStatusInBackground(context, "open-meteo", false);
      return new Response(
        JSON.stringify({
          error: "A fonte meteorológica (Open-Meteo) está temporariamente indisponível.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    forecast = await res.json();
    recordStatusInBackground(context, "open-meteo", true);
  } catch {
    recordStatusInBackground(context, "open-meteo", false);
    return new Response(
      JSON.stringify({ error: "Falha de conexão com o Open-Meteo." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Localização e qualidade do ar são buscadas em paralelo — nenhuma das
  // duas é crítica o suficiente para bloquear a resposta se falhar.
  const [location, airQuality] = await Promise.all([
    reverseGeocode(lat, lon),
    fetchAirQuality(lat, lon),
  ]);

  // UV atual: Open-Meteo não expõe uv_index no bloco "current" de forma
  // consistente entre versões da API, então derivamos o valor real da
  // hora presente a partir do array horário (mesmo dado, mesma fonte).
  const currentTimeStr: string = forecast.current?.time || "";
  const hourlyTimes: string[] = forecast.hourly?.time || [];
  const currentTimestamp = new Date(currentTimeStr).getTime();
  // Em vez de exigir igualdade exata de texto entre current.time e cada
  // item de hourly.time (que pode falhar silenciosamente por diferenças
  // sutis de formatação e cair sempre no índice 0 = meia-noite), achamos
  // a hora mais PRÓXIMA por diferença real de timestamp.
  let currentHourIndex = 0;
  let smallestDiff = Infinity;
  hourlyTimes.forEach((t: string, i: number) => {
    const diff = Math.abs(new Date(t).getTime() - currentTimestamp);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      currentHourIndex = i;
    }
  });
  const currentUv = forecast.hourly?.uv_index?.[currentHourIndex] ?? 0;

  const hourly = (forecast.hourly?.time || [])
    .slice(currentHourIndex)
    .map((time: string, i: number) => ({
      time,
      // Temperatura do "Agora" também alinhada ao current.temperature_2m
      // (mesmo raciocínio do weatherCode acima).
      temp: i === 0 ? forecast.current.temperature_2m : forecast.hourly.temperature_2m[currentHourIndex + i],
      precipitationProbability: forecast.hourly.precipitation_probability[currentHourIndex + i] ?? 0,
      // O primeiro item ("Agora") usa o MESMO weatherCode do card
      // principal (current.weather_code), não o da hora do array
      // horário — os dois representam o instante presente, e o
      // Open-Meteo pode calculá-los de forma levemente diferente
      // (nowcast instantâneo vs. representativo da hora inteira),
      // gerando uma contradição visual (ex: "Parcialmente nublado" no
      // topo, ícone de chuva no "Agora"). Para as horas seguintes,
      // mantemos o dado horário real normalmente.
      weatherCode: i === 0 ? forecast.current.weather_code : forecast.hourly.weather_code[currentHourIndex + i],
    }));

  const daily = (forecast.daily?.time || []).map((date: string, i: number) => ({
    date,
    tempMax: forecast.daily.temperature_2m_max[i],
    tempMin: forecast.daily.temperature_2m_min[i],
    precipitationProbability: forecast.daily.precipitation_probability_max?.[i] ?? 0,
    precipitationSum: forecast.daily.precipitation_sum?.[i] ?? 0,
    weatherCode: forecast.daily.weather_code[i],
    source: "open-meteo" as "inmet" | "open-meteo",
  }));

  // INMET como fonte primária de máx/mín diário: resolve o código IBGE
  // do município (via API oficial do IBGE) e busca a previsão real do
  // INMET para sobrescrever os valores do Open-Meteo nas datas em que o
  // INMET tiver cobertura. Se qualquer etapa falhar (cidade não
  // resolvida, INMET sem dado para o município, erro de rede), os
  // valores do Open-Meteo já calculados acima permanecem intactos — a
  // resposta nunca fica pior por causa dessa tentativa extra.
  if (location?.city && location?.state) {
    try {
      const ibgeCode = await resolveIbgeCode(location.city, location.state);
      if (ibgeCode) {
        const inmetDays = await fetchInmetForecast(ibgeCode);
        recordStatusInBackground(context, "inmet", true);
        const inmetByDate = new Map(inmetDays.map((d) => [d.date, d]));
        for (const day of daily) {
          const inmetDay = inmetByDate.get(day.date);
          if (inmetDay) {
            day.tempMax = inmetDay.tempMax;
            day.tempMin = inmetDay.tempMin;
            day.source = "inmet";
          }
        }
      }
    } catch {
      // Falha silenciosa para o usuário — Open-Meteo já preencheu tudo,
      // nada quebra na resposta. Mas o admin é avisado em segundo plano.
      recordStatusInBackground(context, "inmet", false);
    }
  }

  const weatherData = {
    city: location?.city || "",
    state: location?.state || "",
    country: location?.country || "Brasil",
    lat,
    lon,
    temp: forecast.current.temperature_2m,
    feelsLike: forecast.current.apparent_temperature,
    tempMax: daily[0]?.tempMax ?? forecast.current.temperature_2m,
    tempMin: daily[0]?.tempMin ?? forecast.current.temperature_2m,
    humidity: forecast.current.relative_humidity_2m,
    windSpeed: forecast.current.wind_speed_10m,
    windDirection: forecast.current.wind_direction_10m,
    // pressure_msl (ajustada ao nível do mar) — não surface_pressure, que
    // varia com a altitude local e tornaria "alta/baixa" incorreto para
    // cidades com elevação (ex: Alagoinhas, ~150m).
    pressure: forecast.current.pressure_msl,
    precipitation: forecast.current.precipitation ?? 0,
    visibility: forecast.current.visibility ?? null,
    uvIndex: currentUv,
    weatherCode: forecast.current.weather_code,
    isDay: forecast.current.is_day === 1,
    sunrise: forecast.daily?.sunrise?.[0] ?? null,
    sunset: forecast.daily?.sunset?.[0] ?? null,
    airQuality,
    hourly,
    daily,
    // Calculado de verdade a partir dos dias reais, não um valor fixo —
    // só diz "inmet" se pelo menos um dia realmente usou o INMET.
    source: daily.some((d: any) => d.source === "inmet") ? "open-meteo+inmet" : "open-meteo",
    fetchedAt: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify({
      ...weatherData,
      ...(debugMode
        ? {
            debugRaw: {
              precipitation_raw: forecast.current.precipitation,
              visibility_raw: forecast.current.visibility,
              pressure_msl_raw: forecast.current.pressure_msl,
              note: "Se visibility_raw for um número bem maior que ~24000, provavelmente está em pés, não metros.",
            },
          }
        : {}),
    }),
    {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    },
  );
};
