// GET /api/alerts?lat=X&lon=Y
//
// Consulta sob demanda dos alertas oficiais do INMET para uma
// coordenada — a lógica real (geocode -> IBGE -> radarmeteorologico)
// vive em functions/_shared/inmetAlerts.ts, reaproveitada também pelo
// verificador periódico de notificações push.

import { fetchInmetAlertsForCoords } from "../_shared/inmetAlerts";

interface Env {}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return new Response(JSON.stringify({ alerts: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const alerts = await fetchInmetAlertsForCoords(lat, lon);
  return new Response(JSON.stringify({ alerts }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
};
