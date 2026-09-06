import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Users,
  Megaphone,
  LayoutDashboard,
  Send,
  Radio,
} from "lucide-react";
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from "../lib/firebase";
import { ONLINE_THRESHOLD_MS } from "../hooks/useHeartbeat";
import { UserListManager } from "./UserListManager";
import type { Advertisement, AppUser, Broadcast } from "../types";

interface Props {
  currentUser: AppUser;
  onBack: () => void;
}

const MAX_ACTIVE_ADS = 5;
const EMPTY_FORM = {
  type: "mixed" as "text" | "banner" | "mixed",
  title: "",
  description: "",
  imageUrl: "",
  ctaText: "Saiba mais",
  ctaUrl: "",
};

export function AdminScreen({ currentUser, onBack }: Props) {
  const [tab, setTab] = useState<"dashboard" | "ads" | "broadcast" | "users">("dashboard");
  const [usersPresetFilter, setUsersPresetFilter] = useState<"all" | "online" | "week" | "inactive30">("all");

  function goToUsersFiltered(filter: "all" | "online" | "week" | "inactive30") {
    setUsersPresetFilter(filter);
    setTab("users");
  }

  return (
    <div className="sky-clear-night sky-vignette relative min-h-dvh pb-10">
      <div className="w-full max-w-md mx-auto">
      <div className="relative flex items-center gap-3 px-5 pt-8">
        <button onClick={onBack} className="glass rounded-full p-2" aria-label="Voltar">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-bold text-lg">Painel Admin</h1>
      </div>

      <div className="relative flex gap-1.5 px-5 mt-5 overflow-x-auto">
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={LayoutDashboard}>
          Dashboard
        </TabButton>
        <TabButton active={tab === "ads"} onClick={() => setTab("ads")} icon={Megaphone}>
          Anúncios
        </TabButton>
        <TabButton active={tab === "broadcast"} onClick={() => setTab("broadcast")} icon={Radio}>
          Notificar
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users}>
          Usuários
        </TabButton>
      </div>

      <div className="relative mt-5 px-5">
        {tab === "dashboard" && <DashboardTab onSelectSegment={goToUsersFiltered} />}
        {tab === "ads" && <AdsManager currentUser={currentUser} />}
        {tab === "broadcast" && <BroadcastManager currentUser={currentUser} />}
        {tab === "users" && (
          <>
            <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
              Para promover um usuário a administrador, atualize manualmente o campo{" "}
              <code className="bg-black/30 px-1 rounded">role</code> para{" "}
              <code className="bg-black/30 px-1 rounded">"admin"</code> no Firestore
              Console (ação deliberadamente fora de um clique no app, por segurança).
            </p>
            <UserListManager currentUser={currentUser} initialActivityFilter={usersPresetFilter} />
          </>
        )}
      </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition shrink-0 ${
        active ? "bg-white/15 text-white" : "text-white/60"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

function DashboardTab({
  onSelectSegment,
}: {
  onSelectSegment: (filter: "all" | "online" | "week" | "inactive30") => void;
}) {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [onlineNow, setOnlineNow] = useState<number | null>(null);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [inactive30, setInactive30] = useState<number | null>(null);
  const [totalAds, setTotalAds] = useState<number | null>(null);
  const [sourceStatus, setSourceStatus] = useState<
    Record<string, { isUp: boolean; lastChangeAt: string } | null>
  >({ inmet: null, "open-meteo": null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const inactive30Ms = 30 * 24 * 60 * 60 * 1000;
      let online = 0;
      let week = 0;
      let inactive = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        const lastActive: Timestamp | undefined = data.lastActiveAt;
        if (lastActive) {
          const ms = lastActive.toMillis();
          if (now - ms < ONLINE_THRESHOLD_MS) online++;
          if (now - ms < weekMs) week++;
          if (now - ms >= inactive30Ms) inactive++;
        } else {
          inactive++;
        }
      });
      setTotalUsers(snap.size);
      setOnlineNow(online);
      setActiveWeek(week);
      setInactive30(inactive);
      setLoading(false);
    });

    const unsubAds = onSnapshot(collection(db, "ads"), (snap) => {
      setTotalAds(snap.docs.filter((d) => d.data().active && !d.data().deletedAt).length);
    });

    const unsubStatus = onSnapshot(collection(db, "systemStatus"), (snap) => {
      setSourceStatus((prev) => {
        const next = { ...prev };
        snap.docs.forEach((d) => {
          const data = d.data();
          next[d.id] = { isUp: data.isUp, lastChangeAt: data.lastChangeAt };
        });
        return next;
      });
    });

    return () => {
      unsub();
      unsubAds();
      unsubStatus();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-white/45 px-1">
        Toque em um card para ver, filtrar e enviar mensagem para os usuários daquele grupo.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Online agora" value={onlineNow} live sub="toque para ver" onClick={() => onSelectSegment("online")} />
        <StatCard label="Ativos (7 dias)" value={activeWeek} sub="toque para ver" onClick={() => onSelectSegment("week")} />
        <StatCard label="Total cadastrados" value={totalUsers} sub="toque para ver todos" onClick={() => onSelectSegment("all")} />
        <StatCard
          label="Inativos (30+ dias)"
          value={inactive30}
          sub="toque para ver e filtrar"
          warn
          onClick={() => onSelectSegment("inactive30")}
        />
        <StatCard label="Anúncios ativos" value={totalAds} sub={`máx. ${MAX_ACTIVE_ADS}`} />
      </div>

      <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide mt-2 px-1">
        Status das Fontes de Dado
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["inmet", "open-meteo"] as const).map((source) => {
          const status = sourceStatus[source];
          const label = source === "inmet" ? "INMET" : "Open-Meteo";
          return (
            <div key={source} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === null
                      ? "bg-white/25"
                      : status.isUp
                        ? "bg-emerald-400"
                        : "bg-red-400 animate-pulse"
                  }`}
                />
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">
                  {label}
                </p>
              </div>
              <p className={`text-sm font-semibold ${status && !status.isUp ? "text-red-300" : ""}`}>
                {status === null ? "Sem falha registrada" : status.isUp ? "No ar" : "Fora do ar"}
              </p>
              {status && (
                <p className="text-[10px] text-white/45 mt-1">
                  Desde {new Date(status.lastChangeAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/40 px-1">
        Verificado automaticamente a cada consulta real de clima — você é notificado por
        push assim que uma fonte cair ou voltar.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  live,
  warn,
  onClick,
}: {
  label: string;
  value: number | null;
  sub: string;
  live?: boolean;
  warn?: boolean;
  onClick?: () => void;
}) {
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`glass rounded-2xl p-4 text-left w-full ${warn ? "border border-amber-400/25" : ""}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${warn ? "text-amber-300/80" : "text-white/60"}`}>
          {label}
        </p>
      </div>
      <p className={`text-3xl font-thin ${warn ? "text-amber-200" : ""}`}>{value ?? "—"}</p>
      <p className="text-[10px] text-white/45 mt-1">{sub}</p>
    </Wrapper>
  );
}

function AdsManager({ currentUser }: { currentUser: AppUser }) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [limitWarning, setLimitWarning] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "ads"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Advertisement));
    });
    return () => unsub();
  }, []);

  const activeCount = ads.filter((a) => a.active && !(a as any).deletedAt).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const id = crypto.randomUUID();
    await setDoc(doc(db, "ads", id), {
      ...form,
      order: ads.length,
      active: activeCount < MAX_ACTIVE_ADS,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setCreating(false);
  }

  async function toggleActive(ad: Advertisement) {
    if (!ad.active && activeCount >= MAX_ACTIVE_ADS) {
      setLimitWarning(true);
      setTimeout(() => setLimitWarning(false), 3000);
      return;
    }
    await updateDoc(doc(db, "ads", ad.id), { active: !ad.active });
  }

  async function removeAd(id: string) {
    await updateDoc(doc(db, "ads", id), { active: false, deletedAt: new Date().toISOString() });
    setConfirmDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/60">
          {activeCount} de {MAX_ACTIVE_ADS} anúncios ativos
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-900 rounded-full px-3 py-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo anúncio
        </button>
      </div>

      {limitWarning && (
        <p className="text-xs text-amber-300 bg-amber-500/10 rounded-xl px-3 py-2 animate-fade-in">
          Máximo de {MAX_ACTIVE_ADS} anúncios ativos ao mesmo tempo. Desative um antes de ativar outro.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-4 flex flex-col gap-2.5 animate-fade-in">
          <div className="flex gap-1 p-1 bg-black/25 rounded-full">
            {(["text", "banner", "mixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold ${
                  form.type === t ? "bg-white/15 text-white" : "text-white/55"
                }`}
              >
                {t === "text" ? "Texto" : t === "banner" ? "Banner" : "Misto"}
              </button>
            ))}
          </div>
          <Input label="Título" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <Input
            label="Texto"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            required
          />
          {form.type !== "text" && (
            <Input
              label="URL da imagem"
              value={form.imageUrl}
              onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
            />
          )}
          <Input
            label="Texto do botão (opcional)"
            value={form.ctaText}
            onChange={(v) => setForm((f) => ({ ...f, ctaText: v }))}
          />
          <Input
            label="Link de destino (opcional)"
            value={form.ctaUrl}
            onChange={(v) => setForm((f) => ({ ...f, ctaUrl: v }))}
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-1 bg-white text-slate-900 text-sm font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar anúncio
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2.5">
        {ads
          .filter((a) => !(a as any).deletedAt)
          .map((ad) => (
            <div key={ad.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              {ad.imageUrl && (
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center shrink-0 bg-white/5 no-invert"
                  style={{ backgroundImage: `url(${ad.imageUrl})` }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ad.title}</p>
                <p className="text-xs text-white/58 truncate">{ad.description}</p>
              </div>

              {confirmDeleteId === ad.id ? (
                <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                  <span className="text-[11px] text-white/60">Excluir?</span>
                  <button
                    onClick={() => removeAd(ad.id)}
                    className="bg-red-500/80 text-white text-[11px] font-semibold rounded-full px-2.5 py-1.5"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="glass rounded-full px-2.5 py-1.5 text-[11px] text-white/60"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => toggleActive(ad)} className="glass rounded-full p-2 shrink-0" aria-label={ad.active ? "Desativar" : "Ativar"}>
                    {ad.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-white/58" />}
                  </button>
                  <button onClick={() => setConfirmDeleteId(ad.id)} className="glass rounded-full p-2 shrink-0" aria-label="Excluir">
                    <Trash2 className="w-3.5 h-3.5 text-red-300" />
                  </button>
                </>
              )}
            </div>
          ))}
        {ads.length === 0 && <p className="text-center text-sm text-white/52 py-8">Nenhum anúncio cadastrado ainda.</p>}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-white/60 font-medium">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="bg-black/25 rounded-lg px-3 py-2 text-sm outline-none border border-white/5 focus:border-white/20"
      />
    </label>
  );
}

function BroadcastManager({ currentUser }: { currentUser: AppUser }) {
  const [mode, setMode] = useState<"all" | "select">("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(10) as any);
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Broadcast));
    });
    return () => unsub();
  }, []);

  async function handleSendAll(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    const id = crypto.randomUUID();
    await setDoc(doc(db, "broadcasts", id), {
      message: message.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      targetUids: null,
    });
    setMessage("");
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 bg-black/25 rounded-full">
        <button
          onClick={() => setMode("all")}
          className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold ${
            mode === "all" ? "bg-white/15 text-white" : "text-white/55"
          }`}
        >
          Notificar todos
        </button>
        <button
          onClick={() => setMode("select")}
          className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold ${
            mode === "select" ? "bg-white/15 text-white" : "text-white/55"
          }`}
        >
          Selecionar destinatários
        </button>
      </div>

      <p className="text-[11px] text-white/50 leading-relaxed px-1">
        Isto é uma notificação DENTRO DO APP (banner na Home). Para chegar mesmo
        com o celular fechado, use o card de Notificações Push (alertas
        automáticos do INMET) — mensagens daqui não acordam o celular.
      </p>

      {mode === "all" ? (
        <div className="glass rounded-2xl p-4">
          <form onSubmit={handleSendAll} className="flex flex-col gap-2.5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva o aviso para todos os usuários..."
              rows={3}
              className="bg-black/25 rounded-lg px-3 py-2 text-sm outline-none border border-white/5 focus:border-white/20 resize-none"
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="bg-white text-slate-900 text-sm font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar a todos os cadastrados
            </button>
            {sent && <p className="text-xs text-emerald-300 text-center">Enviado com sucesso.</p>}
          </form>
        </div>
      ) : (
        <UserListManager currentUser={currentUser} allowMessaging />
      )}

      <div>
        <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide mb-2">Histórico</p>
        <div className="flex flex-col gap-2">
          {history.map((b) => (
            <div key={b.id} className="glass rounded-xl p-3">
              <p className="text-sm">{b.message}</p>
              <p className="text-[10px] text-white/45 mt-1">
                {new Date(b.createdAt).toLocaleString("pt-BR")}
                {b.targetUids && b.targetUids.length > 0
                  ? ` · ${b.targetUids.length} destinatário${b.targetUids.length > 1 ? "s" : ""} específico${b.targetUids.length > 1 ? "s" : ""}`
                  : " · todos os usuários"}
              </p>
            </div>
          ))}
          {history.length === 0 && <p className="text-xs text-white/52">Nenhum aviso enviado ainda.</p>}
        </div>
      </div>
    </div>
  );
}