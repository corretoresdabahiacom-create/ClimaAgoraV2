import type { EffectType } from "../lib/weatherCodes";

// Camada de efeitos visuais ambientes — 100% decorativa, nenhum número
// aqui representa dado além do próprio "effect" e "isDay" recebidos, que
// já vêm do código real do Open-Meteo (nunca escolhido por adivinhação).
//
// REGRA DE OURO (pedida explicitamente): esta camada NUNCA pode
// atrapalhar a leitura dos dados. Por isso ela é:
// 1. position: absolute, limitada a uma tela de altura (h-screen), com
//    z-index explícito e BAIXO (z-1), sempre atrás do conteúdo (z-10).
// 2. pointer-events: none em tudo, sem exceção.
// 3. Elementos nunca cobrem o centro onde ficam os números grandes.
// 4. Respeita prefers-reduced-motion (regra global em index.css).

interface Props {
  effect: EffectType;
  isDay: boolean;
  sunrise: string | null;
  sunset: string | null;
}

function computeRealSunPosition(sunrise: string | null, sunset: string | null) {
  if (!sunrise || !sunset) return null;
  const now = Date.now();
  const riseMs = new Date(sunrise).getTime();
  const setMs = new Date(sunset).getTime();
  if (now < riseMs || now > setMs) return null;

  const progress = (now - riseMs) / (setMs - riseMs);
  const angle = Math.PI - progress * Math.PI;
  const xPct = 50 - 42 * Math.cos(angle);
  const yPct = 62 - 48 * Math.sin(angle);
  return { xPct, yPct };
}

// Nuvem desenhada de verdade (silhueta vetorial), não um borrão sem forma
// — o mesmo princípio visual usado pelo Apple Weather: formas limpas e
// reconhecíveis, com profundidade dada por camadas (longe = menor, mais
// clara, mais lenta; perto = maior, mais opaca, mais rápida).
function CloudShape({ opacity, tint }: { opacity: number; tint: string }) {
  return (
    <svg viewBox="0 0 200 100" width="100%" height="100%" style={{ opacity }}>
      <ellipse cx="60" cy="65" rx="50" ry="30" fill={tint} />
      <ellipse cx="105" cy="50" rx="42" ry="34" fill={tint} />
      <ellipse cx="145" cy="62" rx="38" ry="26" fill={tint} />
      <ellipse cx="90" cy="72" rx="70" ry="24" fill={tint} />
    </svg>
  );
}

export function WeatherEffectLayer({ effect, isDay, sunrise, sunset }: Props) {
  const sunPos = isDay && effect === "clear" ? computeRealSunPosition(sunrise, sunset) : null;

  return (
    <div
      className="absolute top-0 inset-x-0 h-dvh overflow-hidden pointer-events-none z-[1]"
      aria-hidden="true"
    >
      {/* ---------- SOL REAL, SEGUINDO O PERCURSO DO DIA ---------- */}
      {sunPos && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              left: `${sunPos.xPct}%`,
              top: `${sunPos.yPct}%`,
              width: 220,
              height: 220,
              marginLeft: -110,
              marginTop: -110,
              background:
                "radial-gradient(circle, rgba(255,245,190,1) 0%, rgba(255,215,100,0.85) 28%, rgba(255,200,80,0) 65%)",
              animation: "sun-glow 4s ease-in-out infinite",
              transition: "left 60s linear, top 60s linear",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              left: `${sunPos.xPct}%`,
              top: `${sunPos.yPct}%`,
              width: 70,
              height: 70,
              marginLeft: -35,
              marginTop: -35,
              background: "#fff8e0",
              boxShadow: "0 0 40px 12px rgba(255,240,180,0.9)",
              transition: "left 60s linear, top 60s linear",
            }}
          />
        </>
      )}

      {/* ---------- ESTRELAS (céu limpo à noite) ---------- */}
      {!isDay && effect === "clear" && (
        <>
          {Array.from({ length: 34 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 1.5 + (i % 3),
                height: 1.5 + (i % 3),
                left: `${(i * 13.7) % 100}%`,
                top: `${(i * 23.3) % 55}%`,
                opacity: 0.55 + (i % 5) * 0.09,
                animation: `twinkle ${2 + (i % 4)}s ease-in-out infinite`,
                animationDelay: `${(i % 6) * 0.4}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ---------- NUVENS REAIS (parcialmente nublado / nublado) ---------- */}
      {effect === "cloudy" && (
        <>
          {[
            { top: "4%", w: 260, h: 130, dur: 42, delay: -6, op: 0.5, tint: "#e8edf5" },
            { top: "16%", w: 320, h: 160, dur: 34, delay: -18, op: 0.68, tint: "#f4f7fb" },
            { top: "30%", w: 220, h: 110, dur: 50, delay: -30, op: 0.42, tint: "#dfe6f0" },
            { top: "42%", w: 280, h: 140, dur: 38, delay: -10, op: 0.6, tint: "#eef2f8" },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: c.w,
                height: c.h,
                top: c.top,
                left: "-30%",
                filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.12))",
                animation: `drift-cloud ${c.dur}s linear infinite`,
                animationDelay: `${c.delay}s`,
              }}
            >
              <CloudShape opacity={c.op} tint={c.tint} />
            </div>
          ))}
        </>
      )}

      {/* ---------- NEBLINA ---------- */}
      {effect === "fog" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute left-0 right-0 bg-white/30 blur-2xl"
              style={{
                height: "22%",
                top: `${10 + i * 20}%`,
                animation: `fog-drift ${18 + i * 5}s ease-in-out infinite`,
                animationDelay: `${i * -5}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ---------- GAROA ---------- */}
      {effect === "drizzle" && (
        <>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-[1.5px] h-5 rounded-full"
              style={{
                left: `${(i * 4.3) % 100}%`,
                top: "-5%",
                background: "rgba(200,225,255,0.55)",
                animation: `fall ${1.4 + (i % 4) * 0.25}s linear infinite`,
                animationDelay: `${(i % 9) * 0.3}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ---------- CHUVA ---------- */}
      {effect === "rain" && (
        <>
          {Array.from({ length: 46 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-[2px] h-12 rounded-full"
              style={{
                left: `${(i * 2.3) % 100}%`,
                top: "-8%",
                background: "linear-gradient(to bottom, rgba(180,210,255,0), rgba(190,220,255,0.75))",
                transform: "rotate(9deg)",
                animation: `fall ${0.5 + (i % 5) * 0.1}s linear infinite`,
                animationDelay: `${(i % 8) * 0.12}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ---------- NEVE ---------- */}
      {effect === "snow" && (
        <>
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 4 + (i % 3),
                height: 4 + (i % 3),
                left: `${(i * 3.5) % 100}%`,
                top: "-5%",
                opacity: 0.95,
                boxShadow: "0 0 4px rgba(255,255,255,0.8)",
                animation: `snow-fall ${5 + (i % 6)}s linear infinite`,
                animationDelay: `${(i % 10) * 0.55}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ---------- TEMPESTADE ---------- */}
      {effect === "storm" && (
        <>
          {[
            { top: "6%", w: 300, h: 140, dur: 30, op: 0.55 },
            { top: "22%", w: 260, h: 120, dur: 24, op: 0.65 },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: c.w,
                height: c.h,
                top: c.top,
                left: "-30%",
                animation: `drift-cloud ${c.dur}s linear infinite`,
              }}
            >
              <CloudShape opacity={c.op} tint="#2a3548" />
            </div>
          ))}

          {Array.from({ length: 50 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-[2px] h-14 rounded-full"
              style={{
                left: `${(i * 2.1) % 100}%`,
                top: "-8%",
                background: "linear-gradient(to bottom, rgba(190,210,255,0), rgba(200,220,255,0.85))",
                transform: "rotate(13deg)",
                animation: `fall ${0.35 + (i % 5) * 0.07}s linear infinite`,
                animationDelay: `${(i % 8) * 0.1}s`,
              }}
            />
          ))}

          <div className="absolute inset-0" style={{ animation: "flash 6.5s ease-in-out infinite" }} />

          <svg
            viewBox="0 0 100 200"
            className="absolute"
            style={{ left: "20%", top: "0%", width: 70, height: 180, animation: "bolt-appear 6.5s ease-in-out infinite" }}
          >
            <polyline points="50,0 33,72 56,72 26,165 68,88 44,88 62,0" fill="rgba(255,255,255,0.95)" />
          </svg>
          <svg
            viewBox="0 0 100 200"
            className="absolute"
            style={{ left: "66%", top: "0%", width: 52, height: 135, animation: "bolt-appear-2 10s ease-in-out infinite" }}
          >
            <polyline points="50,0 36,62 55,62 30,145 63,78 45,78 60,0" fill="rgba(255,255,255,0.85)" />
          </svg>
        </>
      )}

      <style>{`
        @keyframes sun-glow {
          0%, 100% { opacity: 0.88; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        @keyframes drift-cloud {
          from { transform: translateX(0); }
          to { transform: translateX(160vw); }
        }
        @keyframes fog-drift {
          0%, 100% { transform: translateX(-8%); opacity: 0.75; }
          50% { transform: translateX(8%); opacity: 1; }
        }
        @keyframes fall {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(115vh); opacity: 0.35; }
        }
        @keyframes snow-fall {
          from { transform: translateY(0) translateX(0); opacity: 1; }
          50% { transform: translateY(55vh) translateX(14px); }
          to { transform: translateY(115vh) translateX(-10px); opacity: 0.6; }
        }
        @keyframes flash {
          0%, 87%, 100% { background: transparent; }
          88%, 91% { background: rgba(255,255,255,0.28); }
          89.5% { background: rgba(255,255,255,0.55); }
        }
        @keyframes bolt-appear {
          0%, 87%, 100% { opacity: 0; }
          88%, 91% { opacity: 1; }
          89.5% { opacity: 0.5; }
        }
        @keyframes bolt-appear-2 {
          0%, 91%, 100% { opacity: 0; }
          92%, 95% { opacity: 0.95; }
          93.5% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
