import { useEffect } from "react";
import { X, HelpCircle } from "lucide-react";

interface GuideSection {
  title: string;
  content: React.ReactNode;
}

const SECTIONS: GuideSection[] = [
  {
    title: "Clima Atual e Tendência",
    content: (
      <>
        <p>
          Temperatura, condição e sensação térmica em tempo real, via{" "}
          <strong>Open-Meteo</strong>. A linha de tendência mostra a temperatura real
          prevista para as próximas horas.
        </p>
      </>
    ),
  },
  {
    title: "Precipitação",
    content: (
      <p>
        Volume real de chuva medido na última hora, em milímetros (1mm = 1 litro de
        água por m²). Fonte: Open-Meteo, atualizado a cada hora.
      </p>
    ),
  },
  {
    title: "Visibilidade",
    content: (
      <p>
        Distância máxima na qual um objeto ainda pode ser identificado a olho nu,
        calculada a partir de umidade, neblina e partículas na atmosfera agora.
      </p>
    ),
  },
  {
    title: "Umidade",
    content: (
      <p>
        Umidade relativa do ar agora — porcentagem de vapor d'água em relação ao
        máximo que o ar poderia reter nessa temperatura, medida a 2m de altura.
      </p>
    ),
  },
  {
    title: "Pressão",
    content: (
      <p>
        Pressão atmosférica ajustada ao nível do mar, em hectopascal (hPa). A média
        global é 1013 hPa — valores mais baixos costumam indicar aproximação de mau
        tempo.
      </p>
    ),
  },
  {
    title: "Sensação Térmica",
    content: (
      <p>
        Temperatura que o corpo realmente percebe, combinando temperatura do ar,
        umidade e vento — pode ser bem diferente da temperatura "seca" do topo da tela.
      </p>
    ),
  },
  {
    title: "Previsão Horária",
    content: (
      <p>
        Temperatura e chance de chuva reais, hora a hora, para as próximas 24h — dado
        direto do modelo do Open-Meteo, sem interpolação artificial.
      </p>
    ),
  },
  {
    title: "Previsão de Vários Dias",
    content: (
      <>
        <p>
          Máxima e mínima real de cada dia, com chuva em mm e % de chance. A etiqueta
          colorida mostra a fonte: <strong>INMET</strong> (órgão oficial brasileiro)
          quando cobre a data, ou <strong>Open-Meteo</strong> quando não cobre.
        </p>
      </>
    ),
  },
  {
    title: "Índice UV",
    content: (
      <p>
        Escala oficial da <strong>Organização Mundial da Saúde</strong>, medida via
        satélite e modelo atmosférico — posição do sol, nuvens e camada de ozônio.
      </p>
    ),
  },
  {
    title: "Qualidade do Ar",
    content: (
      <p>
        Escala oficial <strong>US AQI (EPA)</strong>, a partir da concentração real de
        poluentes (PM2.5, PM10, NO₂, O₃, SO₂, CO) do modelo do Open-Meteo.
      </p>
    ),
  },
  {
    title: "Vento",
    content: (
      <p>
        Velocidade e direção reais a 10m de altura. A direção indica de onde o vento
        sopra (ex: "L" = vindo do Leste) — convenção meteorológica padrão.
      </p>
    ),
  },
  {
    title: "Nascer e Pôr do Sol",
    content: (
      <p>
        Horários astronômicos reais para sua localização exata, calculados a partir de
        latitude, longitude e data.
      </p>
    ),
  },
  {
    title: "Fase da Lua",
    content: (
      <p>
        Fórmula astronômica determinística — mês sinódico real (29,53058867 dias), sem
        depender de API externa. O intervalo mostrado é de quando essa fase nomeada
        começa e termina; dá pra consultar qualquer data.
      </p>
    ),
  },
  {
    title: "Tábua de Maré",
    content: (
      <>
        <p>
          Calculada por harmônicos de maré reais e publicados (constantes
          TICON-4/NOAA). Só existe em pontos costeiros reais — para cidades do
          interior, mostramos o porto real mais próximo.
        </p>
        <p>
          O status (subindo/descendo/alta agora/baixa agora) compara a hora atual com
          os eventos de maré reais mais próximos.
        </p>
      </>
    ),
  },
  {
    title: "Neste Dia, Ano Passado",
    content: (
      <p>
        Clima real observado nesta mesma data, um ano atrás — via Open-Meteo Historical
        Weather API (ERA5), reanálise científica com dados reais de estações,
        satélites e boias oceânicas.
      </p>
    ),
  },
  {
    title: "Pesquisar Período Personalizado",
    content: (
      <p>
        Compare datas específicas com o mesmo período do ano passado, ou veja chuva
        mês a mês em vários anos — dado histórico real (ERA5) e previsão real dentro
        dos próximos 16 dias. Além disso, aparece honestamente como indisponível (não
        existe previsão diária confiável além desse horizonte).
      </p>
    ),
  },
  {
    title: "Alerta de Arboviroses",
    content: (
      <p>
        Fonte: <strong>InfoDengue</strong> (Fiocruz/FGV/Ministério da Saúde), via o
        SINAN — sistema oficial de notificação usado por todas as secretarias de saúde
        do Brasil. Nem todo município tem cobertura ativa.
      </p>
    ),
  },
  {
    title: "Alertas Personalizados",
    content: (
      <p>
        Você define limites (chuva, UV, calor, frio); o app compara com o dado real a
        cada carregamento e avisa dentro da tela se ultrapassar.
      </p>
    ),
  },
  {
    title: "Notificações Push",
    content: (
      <p>
        Quando ativadas, um alerta oficial novo do INMET para suas cidades favoritas
        dispara notificação real — verificado a cada 20 minutos. Só avisa sobre
        alertas genuinamente novos.
      </p>
    ),
  },
  {
    title: "Notícias sobre o Clima",
    content: (
      <p>
        Manchetes reais via <strong>NewsData.io</strong>. Sem notícia da cidade,
        amplia para o estado e depois o Brasil — sempre indicado no título.
      </p>
    ),
  },
  {
    title: "Publicidade",
    content: (
      <p>
        Anúncios inseridos pela administração, sempre identificados como conteúdo
        publicitário — nunca misturados com dado meteorológico.
      </p>
    ),
  },
];

export function HelpGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="no-invert fixed inset-0 z-[70] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white text-[#111] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-black/10 shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            <p className="font-bold text-base">Como funciona cada card</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="info-popover-content overflow-y-auto p-4 flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="font-semibold text-sm mb-1">{s.title}</p>
              <div className="text-xs leading-relaxed flex flex-col gap-1.5" style={{ color: "rgba(17,17,17,0.72)" }}>
                {s.content}
              </div>
            </div>
          ))}
          <p className="text-[10px] pt-2 border-t border-black/10" style={{ color: "rgba(17,17,17,0.5)" }}>
            Nenhum dado deste app é fabricado — cada informação vem de uma fonte
            pública real e verificável.
          </p>
        </div>
      </div>
    </div>
  );
}
