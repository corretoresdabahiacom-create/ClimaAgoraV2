import { useState } from "react";
import { Bell, BellOff, BellRing, TriangleAlert } from "lucide-react";
import type { PushStatus } from "../hooks/usePushNotifications";

interface Props {
  status: PushStatus;
  onEnable: () => Promise<{ ok: boolean; reason?: string }>;
  onDisable: () => Promise<{ ok: boolean }>;
}

// Card SEMPRE visível — antes escondia completamente quando o navegador
// não suportava push, o que causava a impressão de "desaparecer" (a
// detecção de suporte do Firebase pode variar entre carregamentos). Só
// não renderiza nada se ainda não sabemos o estado (carregando).
export function PushNotificationCard({ status, onEnable, onDisable }: Props) {
  const [showRisk, setShowRisk] = useState(false);
  if (status === "loading") return null;

  const icon =
    status === "enabled" ? (
      <BellRing className="w-5 h-5 text-emerald-300" />
    ) : status === "denied" ? (
      <BellOff className="w-5 h-5 text-white/45" />
    ) : status === "unsupported" ? (
      <BellOff className="w-5 h-5 text-white/35" />
    ) : (
      <Bell className="w-5 h-5 text-white/60" />
    );

  const description =
    status === "unsupported"
      ? "Este navegador não suporta notificações push."
      : status === "enabled"
        ? "Ativadas — você será avisado de novos alertas oficiais."
        : status === "denied"
          ? "Bloqueadas nas configurações do navegador. Para reativar, permita notificações para este site nas configurações do seu navegador."
          : status === "disabled"
            ? "Desativadas por você. Pode reativar quando quiser."
            : "Receba um aviso quando surgir um alerta oficial novo.";

  return (
    <div className="px-5 mt-5">
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Notificações push</p>
            <p className="text-xs text-white/60 mt-0.5">{description}</p>
          </div>

          {(status === "default") && (
            <button
              onClick={() => onEnable()}
              className="bg-white text-slate-900 text-xs font-semibold rounded-xl px-3 py-2 shrink-0"
            >
              Ativar
            </button>
          )}
          {status === "disabled" && (
            <button
              onClick={() => onEnable()}
              className="bg-white text-slate-900 text-xs font-semibold rounded-xl px-3 py-2 shrink-0"
            >
              Reativar
            </button>
          )}
          {status === "enabled" && (
            <button
              onClick={() => onDisable()}
              className="glass rounded-xl px-3 py-2 text-xs font-semibold text-white/70 shrink-0"
            >
              Desativar
            </button>
          )}
        </div>

        {(status === "enabled" || status === "default" || status === "disabled") && (
          <button
            onClick={() => setShowRisk((s) => !s)}
            className="flex items-center gap-1.5 text-[10.5px] text-amber-300/80 mt-3"
          >
            <TriangleAlert className="w-3 h-3" />
            {status === "disabled" ? "O que você deixa de receber" : "Sobre os riscos desta funcionalidade"}
          </button>
        )}

        {showRisk && (
          <div className="text-[11px] text-white/60 leading-relaxed mt-2 pt-2 border-t border-white/8 animate-fade-in">
            {status === "disabled" && (
              <p className="mb-2">
                <strong className="text-white/80">Com as notificações desativadas, você não
                será avisado automaticamente</strong> quando surgir um alerta oficial novo
                (chuva forte, vendaval, etc) para suas cidades favoritas, nem quando a
                administração enviar um comunicado importante — mesmo com o app fechado. Você
                ainda pode ver alertas ativos abrindo o app manualmente.
              </p>
            )}
            <p>
              Notificações push podem <strong className="text-white/80">atrasar, falhar
              ou não chegar</strong> por motivos fora do nosso controle — conexão de
              internet, configurações de economia de bateria do aparelho, ou o
              navegador estar totalmente fechado. Não é um mecanismo garantido.
            </p>
            <p className="mt-1.5">
              <strong className="text-white/80">Nunca use isso como única fonte</strong>{" "}
              para decisões de segurança. Em situação de risco real, consulte a Defesa
              Civil (199) ou o serviço de meteorologia oficial diretamente. O ClimaAgora,
              seus desenvolvedores e
              parceiros não se responsabilizam por falha no recebimento de notificações.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
