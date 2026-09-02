# ClimaAgora v2

Clima, tempo, maré, alertas oficiais e saúde pública — construído com foco
em precisão de dados. Design "Dado Calmo": sem gradiente decorativo, sem
vidro, hierarquia por tipografia e espaço.

## Princípio de projeto

**Nenhum dado exibido é fabricado.** Cada informação na tela vem de uma
chamada real a uma fonte pública verificável. Onde não há dado real
disponível para aquele local/momento, a interface diz isso claramente (ou
simplesmente não mostra o card) em vez de estimar ou inventar um valor.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS v4
- **Backend**: Cloudflare Pages Functions (`/functions/api/*`)
- **Auth + Dados**: Firebase Authentication (e-mail/senha + Google) e
  Firestore
- **Notificações push**: Firebase Cloud Messaging (FCM)
- **Automação**: GitHub Actions (verificação periódica de alertas)

## Fontes de dado reais, por funcionalidade

| Funcionalidade | Fonte | Observação |
|---|---|---|
| Clima atual, hora a hora | Open-Meteo Forecast API | — |
| Máx/mín diário | **INMET** (prioritário) + Open-Meteo (consenso/fallback) | INMET via `apiprevmet3.inmet.gov.br`; usado quando cobre a data, Open-Meteo completa o resto |
| Qualidade do ar | Open-Meteo Air Quality API | US AQI + PM2.5/PM10/NO2/O3/SO2/CO |
| Indice UV | Open-Meteo | Escala oficial OMS |
| Mare | Constantes harmonicas TICON-4/NOAA (`@neaps/tide-predictor`) | Calculo local, validado contra a NOAA (erro < 1min/poucos mm). 23 estacoes reais brasileiras |
| Fase da lua | Formula astronomica deterministica | Mes sinodico real, sem API externa |
| Alertas oficiais | INMET, via radarmeteorologico.com.br | Filtrado pelo codigo IBGE real do municipio |
| Noticias | NewsData.io | Fallback cidade -> estado -> Brasil, sempre real |
| Neste dia / Periodo personalizado | Open-Meteo Historical Weather API (ERA5) | Reanalise cientifica real |
| Saude (dengue/zika/chikungunya) | InfoDengue (Fiocruz/FGV/Ministerio da Saude) | Nem todo municipio tem cobertura |
| Geocodificacao (nome -> coordenada) | Open-Meteo Geocoding API | — |
| Geocodificacao reversa (coordenada -> cidade) | Nominatim (OpenStreetMap) | — |
| Codigo IBGE do municipio | API oficial do IBGE (`servicodados.ibge.gov.br`) | Fonte unica, usada por TODAS as features que precisam do codigo (clima, alertas, saude) |

## Setup local

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com as credenciais do seu projeto Firebase (Console do
Firebase -> Configuracoes do projeto -> Seus apps -> SDK config), incluindo
`VITE_FIREBASE_VAPID_KEY` (Cloud Messaging -> Web Push certificates).

No Console do Firebase, habilite:
- **Authentication** -> Sign-in method -> E-mail/senha e Google
- **Firestore Database** -> criar banco (modo producao)
- **Cloud Messaging** -> gerar par de chaves Web Push

Publique as regras de seguranca (cole o conteudo de `firestore.rules` no
Console -> Firestore -> Regras).

Rodar localmente:
```bash
npm run build && npx wrangler pages dev dist
```
(no Windows, rodar via proxy do `npm run dev` direto tem incompatibilidade
conhecida de IPv6 — sempre buildar antes)

## Variaveis de ambiente — lado do cliente (`.env` local e Cloudflare)

Ver `.env.example` — todas com prefixo `VITE_`, valores do proprio SDK do
Firebase (nao sao segredos, ficam expostos no JavaScript do navegador de
qualquer forma).

## Variaveis de ambiente — lado do servidor (so no painel do Cloudflare)

Estas **nunca vao no `.env` nem no Git** — sao segredos reais, configurados
direto em Cloudflare -> seu projeto -> Settings -> Environment Variables:

| Variavel | Para que | Como obter |
|---|---|---|
| `NEWSDATA_API_KEY` | Buscar noticias reais | Conta gratis em newsdata.io |
| `CRON_SECRET` | Proteger o endpoint de verificacao de alertas contra chamadas nao autorizadas | Voce mesmo gera (qualquer texto longo aleatorio) — precisa ser **identico** aqui e no secret do GitHub Actions |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Autenticar como servidor confiavel (enviar push, excluir/bloquear usuario, verificar alertas) | Firebase Console -> Configuracoes do projeto -> Contas de servico -> Gerar nova chave privada -> cole o JSON inteiro como valor |

## GitHub Actions

`.github/workflows/check-alerts.yml` roda a cada 20 minutos, chamando
`/api/check-and-notify-alerts` para verificar alertas novos do INMET nas
cidades favoritas de cada usuario e disparar push real via FCM. Precisa do
secret `CRON_SECRET` configurado no repositorio (Settings -> Secrets and
variables -> Actions), com o mesmo valor usado no Cloudflare.

## Deploy no Cloudflare Pages

1. Suba o projeto para o GitHub.
2. Cloudflare -> Workers & Pages -> Create -> Pages -> Connect to Git.
3. Build command: `npm run build` · Output directory: `dist`.
4. As funcoes em `/functions` sao detectadas automaticamente.
5. Configure as variaveis de ambiente (cliente e servidor, ver acima).

## Painel administrativo

O primeiro administrador precisa ser promovido manualmente:
1. A pessoa cria uma conta normalmente pelo app.
2. No Console do Firebase -> Firestore -> colecao `users` -> documento com o
   UID dela -> altere o campo `role` de `"user"` para `"admin"`.

Isso e intencional: a promocao de admin nao e exposta como acao de um
clique dentro do app, para reduzir a superficie de risco.

**O que o admin pode fazer** (`AdminScreen.tsx` + `UserListManager.tsx`):
- Dashboard com contagens reais (online agora, ativos 7 dias, total,
  inativos 30+/45+/60+/90+/120+ dias), cada card clicavel e filtravel
- Listar, filtrar (funcao/atividade/e-mail), ordenar e paginar usuarios
  reais (20 por pagina)
- Enviar mensagem (dentro do app ou notificacao push real) para
  destinatarios selecionados, individual ou em grupo
- **Suspender** (reversivel, campo Firestore) — usuario nao acessa o app
- **Bloquear** (mais forte, nivel Firebase Auth) — usuario nao consegue
  nem fazer login
- **Excluir permanentemente** (conta de autenticacao + Firestore, via
  Function protegida com verificacao real de admin no servidor)
- CRUD de anuncios (ate 5 ativos simultaneamente)
- Notificar todos ou destinatarios especificos (in-app)

## O que esta implementado

- Login (e-mail/senha + Google, sempre pede escolha de conta) e cadastro
- Termos e Condicoes completos (LGPD, limitacao de responsabilidade,
  propriedade intelectual, foro Salvador/BA), versionados
- Clima atual, previsao horaria e diaria (7/10/14/16 dias) com INMET
  prioritario + Open-Meteo, chuva em mm e % sempre visiveis
- Precipitacao, visibilidade, umidade, pressao (ajustada ao nivel do
  mar) e sensacao termica
- Qualidade do ar (6 poluentes) e indice UV (escala OMS)
- Vento, nascer/por do sol, fase da lua (com intervalo de inicio/fim
  da fase atual e busca por qualquer data)
- Tabua de mare real (harmonicos cientificos) com status
  subindo/descendo/alta agora/baixa agora
- Alertas oficiais do INMET (nunca aparecem sem alerta real ativo)
- Alertas de saude publica (dengue/zika/chikungunya) via InfoDengue
- Noticias reais sobre o clima (cidade -> regiao -> pais)
- "Neste dia, ano passado" e pesquisa de periodo personalizado (por
  data ou por ano, com grafico de chuva)
- Multiplas cidades favoritas, alertas personalizados por limiar
- Notificacao push real (FCM) para alertas novos do INMET, com opcao
  de desativar e aviso de risco/responsabilidade
- Streak de consistencia e conquistas por eventos climaticos reais
  vividos
- Modo Padrao (escuro) e Claro, botao de ajuda ("?") explicando a
  metodologia real de cada card
- PWA instalavel (Android/iOS), responsivo (mobile pequeno -> TV)
- Painel admin completo (ver secao acima)

## Decisoes conscientes de escopo (nao sao bugs)

- **Alergia/polen**: nao implementado — nao existe rede publica de
  monitoramento de polen no Brasil (so um projeto academico local em
  Curitiba). Implementar isso seria inventar cobertura nacional que nao
  existe de verdade.
- **Previsao alem de 16 dias**: mostrada honestamente como indisponivel
  no grafico de periodo personalizado — nao existe previsao diaria real
  e confiavel alem desse horizonte em nenhuma fonte gratuita seria.
- **E-mail para usuarios**: ainda nao implementado (so in-app e push);
  exigiria um provedor de e-mail transacional configurado a parte.

## Atribuicao obrigatoria

- Alertas do INMET: via radarmeteorologico.com.br, atribuicao visivel em
  `AlertsPanel.tsx`.
- Mare: constantes TICON-4/NOAA sob CC BY 4.0, via `@neaps`.
