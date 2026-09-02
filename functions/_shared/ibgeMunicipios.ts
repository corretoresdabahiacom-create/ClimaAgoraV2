// Resolve o código IBGE (7 dígitos) de um município a partir do nome e
// da sigla do estado, usando a API pública oficial do IBGE. Necessário
// porque a API de previsão do INMET identifica municípios por esse
// código, não por nome.
//
// Fonte confirmada ao vivo: servicodados.ibge.gov.br/api/v1/localidades

export async function resolveIbgeCode(city: string, uf: string): Promise<string | null> {
  if (!city || !uf) return null;
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
    );
    if (!res.ok) return null;
    const list: any[] = await res.json();
    if (!Array.isArray(list)) return null;

    const normalized = city.trim().toLowerCase();
    const exact = list.find((m) => (m.nome || "").trim().toLowerCase() === normalized);
    const partial =
      exact ||
      list.find((m) => (m.nome || "").trim().toLowerCase().includes(normalized)) ||
      list.find((m) => normalized.includes((m.nome || "").trim().toLowerCase()));

    return partial?.id != null ? String(partial.id) : null;
  } catch {
    return null;
  }
}
