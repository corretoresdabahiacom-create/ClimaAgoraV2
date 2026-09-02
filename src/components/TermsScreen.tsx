import { useState } from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { db, doc, updateDoc, serverTimestamp } from "../lib/firebase";
import { TERMS_VERSION } from "../types";

export function TermsScreen({ uid }: { uid: string }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    await updateDoc(doc(db, "users", uid), {
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: TERMS_VERSION,
    });
    // O onSnapshot do useAuth já vai refletir a mudança e navegar para a Home.
  }

  return (
    <div className="sky-cloudy-night relative min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md glass rounded-3xl p-6 flex flex-col gap-4 max-h-[85vh] animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <ScrollText className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Termos e Condições</h1>
            <p className="text-xs text-white/58">Versão {TERMS_VERSION}</p>
          </div>
        </div>

        <div className="overflow-y-auto text-sm text-white/70 leading-relaxed flex flex-col gap-4 pr-1">
          <div>
            <p className="text-white/90 font-semibold mb-1">1. Aceitação dos Termos</p>
            <p>
              Ao criar uma conta e utilizar o ClimaAgora ("Aplicativo"), você concorda
              integralmente com estes Termos e Condições. Se não concordar com qualquer
              parte deste documento, não utilize o Aplicativo.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">2. O que é o ClimaAgora</p>
            <p>
              O ClimaAgora exibe previsões meteorológicas obtidas da API pública do{" "}
              <strong className="text-white/90">Open-Meteo</strong>, avisos meteorológicos
              oficiais do <strong className="text-white/90">INMET</strong> (Instituto
              Nacional de Meteorologia), dados de maré calculados a partir de constantes
              harmônicas científicas publicadas, notícias de fontes jornalísticas reais, e
              outras informações de fontes públicas identificadas dentro do próprio
              Aplicativo. Nenhum dado exibido é gerado artificialmente: quando uma
              informação não está disponível, o Aplicativo informa isso claramente em vez
              de estimar ou inventar um valor.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">
              3. Ausência de Garantia — Previsão Não é Certeza
            </p>
            <p>
              Previsões meteorológicas são estimativas probabilísticas baseadas em
              modelos científicos, e não fatos garantidos. <strong className="text-white/90">
              Condições reais podem divergir significativamente do que é exibido</strong>,
              a qualquer momento e sem aviso prévio, devido à natureza caótica e
              imprevisível da atmosfera. O mesmo se aplica a dados de maré, alertas,
              qualidade do ar e quaisquer outras informações apresentadas.
            </p>
            <p className="mt-2">
              <strong className="text-white/90">
                O usuário não deve, em nenhuma hipótese, basear-se exclusivamente nas
                informações fornecidas pelo Aplicativo para tomar decisões que envolvam
                risco à vida, à saúde, ao patrimônio ou a atividades profissionais
                (incluindo, sem limitação, navegação marítima, atividades agrícolas,
                pesca, esportes ao ar livre, viagens ou evacuação em situações de
                emergência).
              </strong>{" "}
              Antes de qualquer decisão com consequências reais, o usuário deve consultar
              fontes oficiais adicionais — como a Defesa Civil (telefone 199), a Marinha
              do Brasil, o INMET diretamente, ou autoridades locais competentes.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">4. Limitação de Responsabilidade</p>
            <p>
              Na máxima extensão permitida pela legislação aplicável, o desenvolvedor do
              Aplicativo, a empresa à qual o Aplicativo pertence, seus sócios,
              administradores societários, <strong className="text-white/90">o(s)
              administrador(es) operacional(is) do Aplicativo</strong> (responsáveis por
              moderação, suporte e gestão de conteúdo dentro do painel administrativo),
              funcionários, representantes e parceiros comerciais ou técnicos (incluindo,
              sem limitação, provedores de dados como Open-Meteo, INMET, NewsData.io e
              Firebase) <strong className="text-white/90">
              não se responsabilizam por quaisquer danos diretos, indiretos, incidentais,
              consequenciais ou de qualquer outra natureza</strong> decorrentes de:
            </p>
            <ul className="list-disc list-inside mt-1.5 flex flex-col gap-1">
              <li>decisões tomadas pelo usuário com base nas informações do Aplicativo;</li>
              <li>imprecisão, atraso, indisponibilidade ou interrupção de dados exibidos;</li>
              <li>falhas técnicas de fontes de dados de terceiros fora do controle do
                desenvolvedor;</li>
              <li>uso indevido ou não autorizado do Aplicativo por terceiros;</li>
              <li>ações de moderação realizadas de boa-fé pelo administrador operacional
                (ver Seção 4.1).</li>
            </ul>
            <p className="mt-2">
              O Aplicativo é fornecido "no estado em que se encontra" ("as is"), sem
              garantias de qualquer tipo, expressas ou implícitas, quanto à precisão,
              confiabilidade ou disponibilidade contínua das informações.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">
              4.1. Suspensão, Bloqueio e Exclusão de Conta
            </p>
            <p>
              O Aplicativo se reserva o direito de <strong className="text-white/90">
              suspender, bloquear ou excluir permanentemente</strong> qualquer conta, a
              critério exclusivo do administrador operacional, em casos de violação
              destes Termos, uso indevido, atividade suspeita de segurança, ou a pedido
              do próprio titular da conta. Essa decisão pode ocorrer sem aviso prévio
              quando houver risco de segurança, e não gera direito a indenização ou
              compensação de qualquer natureza ao usuário afetado.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">4.2. Indenização</p>
            <p>
              O usuário concorda em <strong className="text-white/90">indenizar e
              isentar de responsabilidade</strong> o desenvolvedor, a empresa, seus
              sócios, administradores (societários e operacionais) e parceiros, contra
              quaisquer reclamações, danos ou despesas (incluindo honorários advocatícios
              razoáveis) decorrentes do uso indevido do Aplicativo pelo usuário ou da
              violação destes Termos por parte dele.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">4.3. Notificações Push</p>
            <p>
              O Aplicativo pode, mediante sua permissão explícita, enviar notificações
              push ao seu dispositivo (alertas oficiais do INMET ou mensagens da
              administração). <strong className="text-white/90">Essas notificações
              podem atrasar, falhar ou não chegar</strong> por motivos fora do controle
              do desenvolvedor — conexão de internet, configurações de economia de
              bateria do aparelho, ou o navegador estar completamente fechado. Não é um
              mecanismo garantido de comunicação.
            </p>
            <p className="mt-1.5">
              O usuário não deve usar notificações push como única fonte para decisões
              de segurança. Em situação de risco real, deve consultar a Defesa Civil
              (199) ou o INMET diretamente. O desenvolvedor, a empresa e os
              administradores não se responsabilizam por falha no recebimento de
              notificações. O usuário pode desativar essa funcionalidade a qualquer
              momento dentro do próprio Aplicativo.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">
              5. Proteção de Dados Pessoais (LGPD)
            </p>
            <p>
              O tratamento de dados pessoais realizado pelo ClimaAgora observa a{" "}
              <strong className="text-white/90">
                Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)
              </strong>.
            </p>
            <p className="mt-1.5">
              <strong className="text-white/90">Dados coletados:</strong> e-mail (para
              autenticação), localização geográfica (somente com sua permissão explícita
              e apenas no momento da consulta, nunca armazenada de forma identificável),
              cidades favoritas que você escolher salvar, preferências de alerta,
              histórico de uso do Aplicativo (dias de acesso, conquistas) e, caso você
              ative notificações, um token técnico do dispositivo para envio de push.
            </p>
            <p className="mt-1.5">
              <strong className="text-white/90">Finalidade:</strong> os dados são usados
              exclusivamente para fornecer as funcionalidades do Aplicativo (exibir
              clima da sua região, permitir login, enviar alertas que você configurou).
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros
              para fins de publicidade.
            </p>
            <p className="mt-1.5">
              <strong className="text-white/90">Acesso interno (administração):</strong>{" "}
              o(s) administrador(es) operacional(is) do Aplicativo tem acesso a dados
              cadastrais básicos (e-mail, data de cadastro, atividade) exclusivamente
              para fins de suporte, moderação e comunicação com usuários — nunca para
              fins comerciais alheios ao funcionamento do Aplicativo.
            </p>
            <p className="mt-1.5">
              <strong className="text-white/90">Compartilhamento com terceiros:</strong>{" "}
              utilizamos o Firebase (Google) como operador de dados para autenticação,
              banco de dados e notificações — sujeito à própria política de privacidade
              do Google. Nenhuma outra empresa recebe seus dados pessoais.
            </p>
            <p className="mt-1.5">
              <strong className="text-white/90">Seus direitos:</strong> você pode, a
              qualquer momento, solicitar acesso, correção, portabilidade ou exclusão dos
              seus dados pessoais, bem como revogar o consentimento de localização e
              notificações diretamente nas configurações do dispositivo ou entrando em
              contato através do e-mail informado no rodapé deste documento.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">
              6. Propriedade Intelectual
            </p>
            <p>
              O código-fonte, design, identidade visual, marca "ClimaAgora" e demais
              elementos técnicos e criativos do Aplicativo são de propriedade exclusiva
              do desenvolvedor e/ou da empresa à qual o Aplicativo pertence, protegidos
              pela legislação de direitos autorais e propriedade industrial brasileira e
              internacional. É proibida a cópia, reprodução, engenharia reversa,
              distribuição ou criação de obras derivadas sem autorização expressa por
              escrito. Os dados meteorológicos e de terceiros exibidos permanecem de
              propriedade de suas respectivas fontes originais, citadas dentro do próprio
              Aplicativo.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">7. Publicidade</p>
            <p>
              O Aplicativo pode exibir anúncios inseridos pela administração, sempre
              identificados claramente como conteúdo publicitário. A presença de um
              anúncio não representa endosso, parceria ou garantia de qualidade do
              produto/serviço anunciado pelo desenvolvedor, pela empresa ou por seus
              parceiros.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">8. Alterações destes Termos</p>
            <p>
              Estes Termos podem ser atualizados a qualquer momento. Alterações
              relevantes exigirão novo aceite por parte do usuário antes de continuar
              utilizando o Aplicativo — identificado pelo número de versão exibido no
              topo deste documento.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">9. Foro</p>
            <p>
              Fica eleito o foro da <strong className="text-white/90">Comarca de
              Salvador, Estado da Bahia</strong>, para dirimir quaisquer controvérsias
              decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais
              privilegiado que seja.
            </p>
          </div>

          <div>
            <p className="text-white/90 font-semibold mb-1">10. Contato e Suporte</p>
            <p>
              Dúvidas sobre estes Termos, solicitações relacionadas a dados pessoais
              (LGPD) ou suporte técnico podem ser enviados para:{" "}
              <a href="mailto:admmeuarmazem@gmail.com" className="text-sky-300 underline">
                admmeuarmazem@gmail.com
              </a>
            </p>
          </div>

          <p className="text-[11px] text-white/45 border-t border-white/10 pt-3">
            Este documento é um modelo geral e não substitui aconselhamento jurídico
            individualizado.
          </p>
        </div>

        <label className="flex items-start gap-3 text-xs text-white/60 mt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 accent-white"
          />
          Li e aceito os termos e condições de uso do ClimaAgora.
        </label>

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="bg-white text-slate-900 font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Continuar
        </button>
      </div>
    </div>
  );
}
