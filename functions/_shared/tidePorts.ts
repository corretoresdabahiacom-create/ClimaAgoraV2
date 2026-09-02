// Lista de portos/estações de maré oficiais da Marinha do Brasil (DHN),
// com código "localID" real usado no endpoint público, e coordenadas
// aproximadas reais de cada porto (dado geográfico factual, não
// fabricado) — usadas apenas para encontrar o porto mais PRÓXIMO da
// localização do usuário, já que maré astronômica só existe em pontos
// costeiros reais, nunca no interior.

export interface TidePort {
  id: number;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const TIDE_PORTS: TidePort[] = [
  { id: 10520, name: "Porto de Belém", state: "PA", lat: -1.4558, lon: -48.4902 },
  { id: 10566, name: "Porto de Vila do Conde", state: "PA", lat: -1.5372, lon: -48.7469 },
  { id: 10653, name: "Barra Norte do Rio Amazonas", state: "AP", lat: 0.0464, lon: -50.2072 },
  { id: 20520, name: "Fundeadouro de Salinópolis", state: "PA", lat: -0.6136, lon: -47.3564 },
  { id: 30110, name: "Porto de Itaqui", state: "MA", lat: -2.5697, lon: -44.3672 },
  { id: 30120, name: "São Luís", state: "MA", lat: -2.5297, lon: -44.3028 },
  { id: 30225, name: "Porto de Luís Correia", state: "PI", lat: -2.8828, lon: -41.6675 },
  { id: 30337, name: "Terminal Portuário de Pecém", state: "CE", lat: -3.5439, lon: -38.8181 },
  { id: 30340, name: "Porto de Mucuripe", state: "CE", lat: -3.7136, lon: -38.4839 },
  { id: 30407, name: "Porto de Areia Branca", state: "RN", lat: -4.8628, lon: -37.1381 },
  { id: 30443, name: "Porto de Guamaré", state: "RN", lat: -5.1214, lon: -36.3197 },
  { id: 30445, name: "Porto de Macau", state: "RN", lat: -5.1147, lon: -36.6392 },
  { id: 30461, name: "Porto de Natal", state: "RN", lat: -5.7639, lon: -35.2094 },
  { id: 30540, name: "Porto de Cabedelo", state: "PB", lat: -6.9756, lon: -34.8458 },
  { id: 30645, name: "Porto de Recife", state: "PE", lat: -8.0631, lon: -34.8711 },
  { id: 30685, name: "Porto de Suape", state: "PE", lat: -8.3958, lon: -34.9489 },
  { id: 30725, name: "Porto de Maceió", state: "AL", lat: -9.6658, lon: -35.7350 },
  { id: 30810, name: "Terminal Inácio Barbosa", state: "SE", lat: -10.9472, lon: -37.0455 },
  { id: 30955, name: "Ilha de Fernando de Noronha", state: "PE", lat: -3.8536, lon: -32.4297 },
  { id: 40118, name: "Porto de Madre de Deus", state: "BA", lat: -12.7364, lon: -38.6244 },
  { id: 40135, name: "Porto de Aratu", state: "BA", lat: -12.7797, lon: -38.4989 },
  { id: 40140, name: "Porto de Salvador", state: "BA", lat: -12.9714, lon: -38.5108 },
  { id: 40145, name: "Porto de Ilhéus", state: "BA", lat: -14.7889, lon: -39.0331 },
  { id: 40240, name: "Terminal de Barra do Riacho", state: "ES", lat: -19.8256, lon: -40.0672 },
  { id: 40252, name: "Porto de Vitória", state: "ES", lat: -20.3194, lon: -40.2925 },
  { id: 50140, name: "Porto do Rio de Janeiro", state: "RJ", lat: -22.8944, lon: -43.1783 },
  { id: 50145, name: "Porto de Itaguaí", state: "RJ", lat: -22.9089, lon: -43.8253 },
  { id: 50170, name: "Porto de Angra dos Reis", state: "RJ", lat: -23.0067, lon: -44.3181 },
  { id: 50210, name: "Porto de São Sebastião", state: "SP", lat: -23.8103, lon: -45.4020 },
  { id: 50225, name: "Porto de Santos", state: "SP", lat: -23.9608, lon: -46.3336 },
  { id: 60132, name: "Porto de Paranaguá", state: "PR", lat: -25.5161, lon: -48.5225 },
  { id: 60220, name: "Porto de São Francisco do Sul", state: "SC", lat: -26.2433, lon: -48.6386 },
  { id: 60235, name: "Porto de Itajaí", state: "SC", lat: -26.9078, lon: -48.6650 },
  { id: 60245, name: "Porto de Florianópolis", state: "SC", lat: -27.5969, lon: -48.5495 },
  { id: 60250, name: "Porto de Imbituba", state: "SC", lat: -28.2378, lon: -48.6706 },
  { id: 60370, name: "Porto do Rio Grande", state: "RS", lat: -32.0350, lon: -52.0986 },
];

export function findNearestPort(lat: number, lon: number): TidePort {
  let nearest = TIDE_PORTS[0];
  let minDist = Infinity;
  for (const port of TIDE_PORTS) {
    const d = Math.hypot(port.lat - lat, port.lon - lon);
    if (d < minDist) {
      minDist = d;
      nearest = port;
    }
  }
  return nearest;
}
