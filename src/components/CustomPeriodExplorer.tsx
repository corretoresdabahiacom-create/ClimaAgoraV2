import { useState } from "react";
import { CalendarRange, Loader2, Search } from "lucide-react";
import { SimpleBarChart } from "./SimpleBarChart";

interface DayPoint {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitationSum: number | null;
  weatherCode: number | null;
  source: "historical" | "forecast" | "unavailable";
}

interface MonthPoint {
  yearMonth: string;
  precipitationSum: number | null;
  tempAvgMax: number | null;
  tempAvgMin: number | null;
  source: "historical" | "forecast" | "partial" | "unavailable";
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const MONTH_ABBREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_ABBREV[Number(m) - 1]}/${y.slice(2)}`;
}

export function CustomPeriodExplorer({ lat, lon, isAdmin }: { lat: number; lon: number; isAdmin?: boolean }) {
  const [mode, setMode] = useState<"days" | "years">("days");
  const [expanded, setExpanded] = useState(false);

  // Modo dias
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [dayResult, setDayResult] = useState<{ current: DayPoint[]; lastYear: DayPoint[] } | null>(null);

  // Modo anos
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState(String(currentYear - 1));
  const [endYear, setEndYear] = useState(String(currentYear));
  const [yearResult, setYearResult] = useState<{ months: MonthPoint[] } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchDays() {
    setLoading(true);
    setError(null);
    setDayResult(null);
    try {
      const res = await fetch(
        `/api/date-range-weather?lat=${lat}&lon=${lon}&start=${startDate}&end=${endDate}`,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Não foi possível buscar esse período.");
      } else {
        setDayResult(body);
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function searchYears() {
    setLoading(true);
    setError(null);
    setYearResult(null);
    try {
      const res = await fetch(
        `/api/year-range-weather?lat=${lat}&lon=${lon}&startYear=${startYear}&endYear=${endYear}`,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Não foi possível buscar esse período.");
      } else {
        setYearResult(body);
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  const dayChartData = dayResult
    ? dayResult.current.map((d) => ({
        label: fmtDayLabel(d.date),
        value: d.precipitationSum,
        unavailable: d.source === "unavailable",
      }))
    : [];
  const dayChartLastYear = dayResult
    ? dayResult.lastYear.map((d) => ({
        label: fmtDayLabel(d.date),
        value: d.precipitationSum,
        isSecondary: true,
      }))
    : [];

  const monthChartData = yearResult
    ? yearResult.months.map((m) => ({
        label: fmtMonthLabel(m.yearMonth),
        value: m.precipitationSum,
        unavailable: m.source === "unavailable",
      }))
    : [];

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-2 mb-1"
        >
          <CalendarRange className="w-4 h-4 text-white/60" />
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide flex-1 text-left">
            Pesquisar Período Personalizado
          </p>
        </button>

        {!expanded && (
          <p className="text-[11px] text-white/45">
            Compare datas específicas com o mesmo período do ano passado, ou veja o volume de
            chuva mês a mês em vários anos.
          </p>
        )}

        {expanded && (
          <div className="mt-3 flex flex-col gap-4 animate-fade-in">
            <div className="flex gap-1 p-1 bg-black/25 rounded-full">
              <button
                onClick={() => setMode("days")}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold ${
                  mode === "days" ? "bg-white/15 text-white" : "text-white/55"
                }`}
              >
                Por data
              </button>
              <button
                onClick={() => setMode("years")}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold ${
                  mode === "years" ? "bg-white/15 text-white" : "text-white/55"
                }`}
              >
                Por ano
              </button>
            </div>

            {mode === "days" ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 bg-black/25 rounded-lg px-2 py-2 text-xs outline-none"
                  />
                  <span className="text-white/45 text-xs">até</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 bg-black/25 rounded-lg px-2 py-2 text-xs outline-none"
                  />
                </div>
                <button
                  onClick={searchDays}
                  disabled={loading}
                  className="bg-white text-slate-900 text-xs font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>

                {error && <p className="text-xs text-red-300">{error}</p>}

                {dayResult && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] text-white/55 mb-1.5">
                        Chuva por dia (mm) — <span className="text-sky-300">período atual</span>
                      </p>
                      <SimpleBarChart data={dayChartData} unit="mm" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/55 mb-1.5">
                        Mesmo período, <span className="text-white/70">ano passado</span>
                      </p>
                      <SimpleBarChart data={dayChartLastYear} unit="mm" />
                    </div>
                    {dayResult.current.some((d) => d.source === "unavailable") && (
                      <p className="text-[10px] text-amber-300/80">
                        Dias além de 16 dias no futuro não têm previsão real disponível — barras
                        cinzas indicam ausência de dado, não zero.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    placeholder="Ano inicial"
                    className="flex-1 bg-black/25 rounded-lg px-2 py-2 text-xs outline-none"
                  />
                  <span className="text-white/45 text-xs">até</span>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="Ano final"
                    className="flex-1 bg-black/25 rounded-lg px-2 py-2 text-xs outline-none"
                  />
                </div>
                <button
                  onClick={searchYears}
                  disabled={loading}
                  className="bg-white text-slate-900 text-xs font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>

                {error && <p className="text-xs text-red-300">{error}</p>}

                {yearResult && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-white/55">Chuva por mês (mm)</p>
                    <SimpleBarChart data={monthChartData} unit="mm" />
                    {yearResult.months.some((m) => m.source === "unavailable") && (
                      <p className="text-[10px] text-amber-300/80">
                        Meses futuros além de ~16 dias não têm previsão real disponível — barras
                        cinzas indicam ausência de dado, não zero.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <p className="text-[10px] text-white/45">
              Dado histórico e previsão real{isAdmin && " · Open-Meteo (ERA5)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
