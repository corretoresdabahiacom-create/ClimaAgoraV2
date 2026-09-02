// Busca a previsão oficial do INMET (fonte primária de máx/mín diário,
// por determinação de produto) a partir do código IBGE do município.
//
// Fonte confirmada ao vivo: apiprevmet3.inmet.gov.br/previsao/{codigo}
// Formato real da resposta: { "<codigo>": { "DD/MM/AAAA": { "manha": {...,
// "temp_max": n, "temp_min": n}, "tarde": {...}, "noite": {...} }, ... } }
// Os três períodos do mesmo dia carregam o mesmo par temp_max/temp_min
// (é o máx/mín do dia inteiro, repetido em cada período).

export interface InmetDaySummary {
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
}

export async function fetchInmetForecast(ibgeCode: string): Promise<InmetDaySummary[]> {
  try {
    const res = await fetch(`https://apiprevmet3.inmet.gov.br/previsao/${ibgeCode}`);
    if (!res.ok) return [];
    const data: any = await res.json();
    const cityBlock = data?.[ibgeCode];
    if (!cityBlock || typeof cityBlock !== "object") return [];

    const days: InmetDaySummary[] = [];
    for (const [dateBr, periods] of Object.entries<any>(cityBlock)) {
      const parts = dateBr.split("/");
      if (parts.length !== 3) continue;
      const [dd, mm, yyyy] = parts;
      const iso = `${yyyy}-${mm}-${dd}`;

      const period = periods?.tarde || periods?.manha || periods?.noite;
      if (!period) continue;

      const tempMax = Number(period.temp_max);
      const tempMin = Number(period.temp_min);
      if (!isNaN(tempMax) && !isNaN(tempMin)) {
        days.push({ date: iso, tempMax, tempMin });
      }
    }
    return days;
  } catch {
    return [];
  }
}