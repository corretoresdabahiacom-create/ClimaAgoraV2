// Cálculo de fase lunar por fórmula astronômica determinística.
//
// IMPORTANTE sobre precisão (transparência, não fabricação): usamos a
// duração MÉDIA do mês sinódico (29.53058867 dias). Isso é o mesmo método
// usado por calendários e apps de referência — a órbita lunar real tem
// pequenas variações (elipticidade), então o resultado pode divergir do
// valor "oficial" por até algumas horas em casos raros, nunca por dias.
// Isso é uma aproximação científica padrão, não um valor inventado.

export interface MoonPhaseInfo {
  phase: number; // 0 a 1 (0 = lua nova, 0.5 = lua cheia)
  name: string;
  illumination: number; // 0 a 100 (%)
  emoji: string;
}

const SYNODIC_MONTH_DAYS = 29.53058867;
// Lua nova de referência conhecida e verificável: 6 de janeiro de 2000, 18:14 UTC
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  let phase = (diffDays % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  if (phase < 0) phase += 1;

  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);

  let name: string;
  let emoji: string;
  if (phase < 0.03 || phase >= 0.97) {
    name = "Lua Nova";
    emoji = "🌑";
  } else if (phase < 0.22) {
    name = "Crescente Côncava";
    emoji = "🌒";
  } else if (phase < 0.28) {
    name = "Quarto Crescente";
    emoji = "🌓";
  } else if (phase < 0.47) {
    name = "Crescente Convexa";
    emoji = "🌔";
  } else if (phase < 0.53) {
    name = "Lua Cheia";
    emoji = "🌕";
  } else if (phase < 0.72) {
    name = "Minguante Convexa";
    emoji = "🌖";
  } else if (phase < 0.78) {
    name = "Quarto Minguante";
    emoji = "🌗";
  } else {
    name = "Minguante Côncava";
    emoji = "🌘";
  }

  return { phase, name, illumination, emoji };
}

// Início e fim (datas reais) da fase nomeada atual — por exemplo, "Lua
// Cheia" não é um instante único, é uma faixa de alguns dias em torno do
// pico de iluminação. Calculado a partir das mesmas faixas de "phase"
// usadas para nomear a fase acima, nunca um valor à parte.
const PHASE_BOUNDS: [number, number][] = [
  [0.03, 0.22],
  [0.22, 0.28],
  [0.28, 0.47],
  [0.47, 0.53],
  [0.53, 0.72],
  [0.72, 0.78],
  [0.78, 0.97],
];

export function getPhaseRange(date: Date = new Date()): { start: Date; end: Date } {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const cycleIndex = Math.floor(diffDays / SYNODIC_MONTH_DAYS);
  const phase = diffDays / SYNODIC_MONTH_DAYS - cycleIndex;

  const toDate = (cycle: number, frac: number) =>
    new Date(KNOWN_NEW_MOON_UTC + (cycle + frac) * SYNODIC_MONTH_DAYS * 86_400_000);

  // Lua Nova é uma faixa "contínua" que atravessa a virada de ciclo
  // (vai de 0.97 de um ciclo até 0.03 do próximo).
  if (phase < 0.03) {
    return { start: toDate(cycleIndex - 1, 0.97), end: toDate(cycleIndex, 0.03) };
  }
  if (phase >= 0.97) {
    return { start: toDate(cycleIndex, 0.97), end: toDate(cycleIndex + 1, 0.03) };
  }

  for (const [lo, hi] of PHASE_BOUNDS) {
    if (phase >= lo && phase < hi) {
      return { start: toDate(cycleIndex, lo), end: toDate(cycleIndex, hi) };
    }
  }
  return { start: date, end: date };
}

// Próxima lua cheia e próxima lua nova a partir de hoje — útil para
// planejamento (ex: pesca, maré, atividades noturnas).
export function getNextPhaseDates(from: Date = new Date()) {
  const diffDays = (from.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const currentCycle = diffDays / SYNODIC_MONTH_DAYS;
  const cycleIndex = Math.floor(currentCycle);

  const newMoonOfCycle = (n: number) =>
    new Date(KNOWN_NEW_MOON_UTC + n * SYNODIC_MONTH_DAYS * 86_400_000);
  const fullMoonOfCycle = (n: number) =>
    new Date(KNOWN_NEW_MOON_UTC + (n + 0.5) * SYNODIC_MONTH_DAYS * 86_400_000);

  let nextNewMoon = newMoonOfCycle(cycleIndex + 1);
  if (newMoonOfCycle(cycleIndex).getTime() > from.getTime()) {
    nextNewMoon = newMoonOfCycle(cycleIndex);
  }

  let nextFullMoon = fullMoonOfCycle(cycleIndex);
  if (nextFullMoon.getTime() <= from.getTime()) {
    nextFullMoon = fullMoonOfCycle(cycleIndex + 1);
  }

  return { nextNewMoon, nextFullMoon };
}
