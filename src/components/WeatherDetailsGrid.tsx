import { CloudRain, Eye, Droplets, Gauge, Thermometer } from "lucide-react";

interface Props {
  precipitation: number;
  visibility: number | null;
  humidity: number;
  pressure: number;
  feelsLike: number;
}

function formatVisibility(meters: number | null): string {
  if (meters == null) return "—";
  if (meters >= 10000) return "≥10 km";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function WeatherDetailsGrid({ precipitation, visibility, humidity, pressure, feelsLike }: Props) {
  const items = [
    {
      icon: CloudRain,
      label: "Precipitação",
      value: `${precipitation.toFixed(1)} mm`,
      sub: "última hora",
      info: (
        <>
          <p>
            Volume real de chuva medido na última hora, em milímetros — 1mm equivale a
            1 litro de água por m².
          </p>
          <p>Fonte: Open-Meteo, modelo meteorológico atualizado a cada hora.</p>
        </>
      ),
    },
    {
      icon: Eye,
      label: "Visibilidade",
      value: formatVisibility(visibility),
      sub: visibility != null && visibility >= 10000 ? "ótima" : "reduzida",
      info: (
        <>
          <p>
            Distância máxima real na qual um objeto ainda pode ser identificado a olho
            nu, calculada a partir de umidade, neblina e partículas na atmosfera agora.
          </p>
          <p>Fonte: Open-Meteo.</p>
        </>
      ),
    },
    {
      icon: Droplets,
      label: "Umidade",
      value: `${Math.round(humidity)}%`,
      sub: humidity >= 70 ? "alta" : humidity <= 30 ? "baixa" : "confortável",
      info: (
        <>
          <p>Umidade relativa do ar agora — porcentagem de vapor d'água em relação ao
            máximo que o ar poderia reter nessa temperatura.</p>
          <p>Fonte: Open-Meteo, medição real a 2 metros de altura.</p>
        </>
      ),
    },
    {
      icon: Gauge,
      label: "Pressão",
      value: `${Math.round(pressure)} hPa`,
      sub: pressure >= 1013 ? "alta" : "baixa",
      info: (
        <>
          <p>
            Pressão atmosférica real ao nível da superfície, em hectopascal (hPa). A
            média global ao nível do mar é 1013 hPa — valores mais baixos costumam
            indicar aproximação de mau tempo.
          </p>
          <p>Fonte: Open-Meteo.</p>
        </>
      ),
    },
    {
      icon: Thermometer,
      label: "Sensação",
      value: `${Math.round(feelsLike)}°`,
      sub: "térmica",
      info: (
        <>
          <p>
            Temperatura que o corpo humano realmente percebe, calculada combinando
            temperatura do ar, umidade e vento — pode ser bem diferente da temperatura
            "seca" mostrada no topo da tela.
          </p>
          <p>Fonte: Open-Meteo.</p>
        </>
      ),
    },
  ];

  return (
    <div className="px-5 mt-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`glass rounded-2xl p-3.5 ${
              i === 4 ? "max-sm:col-span-2 max-sm:flex max-sm:flex-col max-sm:items-center max-sm:text-center" : ""
            }`}
          >
            <div
              className={`flex items-center gap-1.5 mb-2 ${
                i === 4 ? "max-sm:justify-center max-sm:w-full max-sm:relative" : ""
              }`}
            >
              <item.icon className="w-3.5 h-3.5 text-white/55" />
              <span className="text-[10px] font-semibold text-white/55 uppercase tracking-wide flex-1 max-sm:flex-none">
                {item.label}
              </span>
            </div>
            <p className="text-xl font-semibold">{item.value}</p>
            <p className="text-[10px] text-white/45 mt-0.5 capitalize">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
