import { useEffect, useMemo, useState } from "react";
import { Search, Send, Loader2, Check, Ban, Trash2, ShieldOff, ShieldAlert, BellRing } from "lucide-react";
import { db, auth, collection, onSnapshot, doc, setDoc, getIdToken, Timestamp } from "../lib/firebase";
import { ONLINE_THRESHOLD_MS } from "../hooks/useHeartbeat";
import type { AppUser } from "../types";

interface RealUser {
  uid: string;
  email: string;
  role: "user" | "admin";
  createdAt: string | null;
  lastActiveAt: number | null; // epoch ms, já convertido de Timestamp
  currentStreak: number;
  unlockedAchievements: number;
  suspended: boolean;
  blocked: boolean;
}

type RoleFilter = "all" | "admin" | "user";
type ActivityFilter = "all" | "online" | "week" | "inactive30" | "inactive45" | "inactive60" | "inactive90" | "inactive120";
type SortKey = "recent" | "oldest" | "az" | "za";
type SendChannel = "app" | "push";

const PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const INACTIVITY_OPTIONS: { key: ActivityFilter; days: number; label: string }[] = [
  { key: "inactive30", days: 30, label: "Inativos 30d" },
  { key: "inactive45", days: 45, label: "Inativos 45d" },
  { key: "inactive60", days: 60, label: "Inativos 60d" },
  { key: "inactive90", days: 90, label: "Inativos 90d" },
  { key: "inactive120", days: 120, label: "Inativos 120d" },
];

// Hook próprio: busca a coleção users inteira (só permitido pra admin,
// via firestore.rules "allow list: if isAdmin()") e normaliza os campos
// reais necessários para filtro/ordenação/exibição.
function useAllUsers() {
  const [users, setUsers] = useState<RealUser[] | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const lastActive: Timestamp | undefined = data.lastActiveAt;
        return {
          uid: d.id,
          email: data.email || "(sem e-mail)",
          role: data.role === "admin" ? "admin" : "user",
          createdAt: data.termsAcceptedAt || data.createdAt || null,
          lastActiveAt: lastActive ? lastActive.toMillis() : null,
          currentStreak: data.currentStreak || 0,
          unlockedAchievements: (data.unlockedAchievements || []).length,
          suspended: data.suspended === true,
          blocked: data.blocked === true,
        } as RealUser;
      });
      setUsers(list);
    });
    return () => unsub();
  }, []);

  return users;
}

interface Props {
  currentUser: AppUser;
  /** Filtro de atividade pré-selecionado ao abrir (usado pelos cards do Dashboard). */
  initialActivityFilter?: ActivityFilter;
  /** Mostra a barra de seleção + envio de mensagem. */
  allowMessaging?: boolean;
}

export function UserListManager({ currentUser, initialActivityFilter = "all", allowMessaging = true }: Props) {
  const users = useAllUsers();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(initialActivityFilter);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [searchEmail, setSearchEmail] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<SendChannel>("app");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendResultNote, setSendResultNote] = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setActivityFilter(initialActivityFilter);
    setPage(0);
  }, [initialActivityFilter]);

  async function toggleSuspend(u: RealUser) {
    await setDoc(doc(db, "users", u.uid), { suspended: !u.suspended }, { merge: true });
  }

  async function callAdminManageUser(targetUid: string, action: "delete" | "block" | "unblock") {
    if (!auth.currentUser) return { ok: false, error: "Sessão inválida." };
    const idToken = await getIdToken(auth.currentUser);
    const res = await fetch("/api/admin-manage-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, targetUid, action }),
    });
    const body = await res.json();
    return { ok: res.ok && body.ok, error: body.error };
  }

  async function handleToggleBlock(u: RealUser) {
    setBusyUid(u.uid);
    setActionError(null);
    const result = await callAdminManageUser(u.uid, u.blocked ? "unblock" : "block");
    if (!result.ok) setActionError(result.error || "Não foi possível atualizar o bloqueio.");
    setBusyUid(null);
  }

  async function handleDelete(uid: string) {
    setBusyUid(uid);
    setActionError(null);
    const result = await callAdminManageUser(uid, "delete");
    if (!result.ok) setActionError(result.error || "Não foi possível excluir este usuário.");
    setBusyUid(null);
    setConfirmDeleteUid(null);
  }

  const now = Date.now();
  const weekMs = 7 * DAY_MS;

  const filtered = useMemo(() => {
    if (!users) return [];
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);

    if (activityFilter === "online") {
      list = list.filter((u) => u.lastActiveAt && now - u.lastActiveAt < ONLINE_THRESHOLD_MS);
    } else if (activityFilter === "week") {
      list = list.filter((u) => u.lastActiveAt && now - u.lastActiveAt < weekMs);
    } else {
      const inactiveOpt = INACTIVITY_OPTIONS.find((o) => o.key === activityFilter);
      if (inactiveOpt) {
        const thresholdMs = inactiveOpt.days * DAY_MS;
        // "Inativo" = nunca ativo (sem lastActiveAt) OU último acesso há
        // mais tempo que o limiar escolhido. Nunca inventamos atividade.
        list = list.filter((u) => !u.lastActiveAt || now - u.lastActiveAt >= thresholdMs);
      }
    }

    if (searchEmail.trim()) {
      const q = searchEmail.trim().toLowerCase();
      list = list.filter((u) => u.email.toLowerCase().includes(q));
    }

    const sorted = [...list];
    switch (sortKey) {
      case "az":
        sorted.sort((a, b) => a.email.localeCompare(b.email));
        break;
      case "za":
        sorted.sort((a, b) => b.email.localeCompare(a.email));
        break;
      case "oldest":
        sorted.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
        break;
      case "recent":
      default:
        sorted.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        break;
    }
    return sorted;
  }, [users, roleFilter, activityFilter, searchEmail, sortKey, now, weekMs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSelect(uid: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelected((s) => {
      const next = new Set(s);
      const allSelected = pageItems.every((u) => next.has(u.uid));
      pageItems.forEach((u) => (allSelected ? next.delete(u.uid) : next.add(u.uid)));
      return next;
    });
  }

  async function handleSend() {
    if (!message.trim() || selected.size === 0) return;
    setSending(true);
    setSendResultNote(null);

    if (channel === "app") {
      const id = crypto.randomUUID();
      await setDoc(doc(db, "broadcasts", id), {
        message: message.trim(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        targetUids: Array.from(selected),
      });
      setSent(true);
    } else {
      // Push real via FCM, imediato, só para quem tem token salvo.
      try {
        const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : null;
        const res = await fetch("/api/admin-send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            targetUids: Array.from(selected),
            title: "ClimaAgora",
            body: message.trim(),
          }),
        });
        const result = await res.json();
        if (res.ok && result.ok) {
          setSent(true);
          setSendResultNote(
            `${result.sent} notificação(ões) entregue(s)` +
              (result.usersWithoutToken > 0
                ? ` · ${result.usersWithoutToken} selecionado(s) sem notificação ativada`
                : ""),
          );
        } else {
          setActionError(result.error || "Falha ao enviar notificação push.");
        }
      } catch {
        setActionError("Falha de conexão ao enviar notificação push.");
      }
    }

    setMessage("");
    setSelected(new Set());
    setSending(false);
    setTimeout(() => {
      setSent(false);
      setSendResultNote(null);
    }, 5000);
  }

  if (!users) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(["all", "admin", "user"] as RoleFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => {
              setRoleFilter(r);
              setPage(0);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${
              roleFilter === r ? "bg-white/15 text-white" : "glass text-white/55"
            }`}
          >
            {r === "all" ? "Todos" : r === "admin" ? "Admin" : "Usuário"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "online", "week"] as ActivityFilter[]).map((a) => (
          <button
            key={a}
            onClick={() => {
              setActivityFilter(a);
              setPage(0);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${
              activityFilter === a ? "bg-white/15 text-white" : "glass text-white/55"
            }`}
          >
            {a === "all" ? "Qualquer atividade" : a === "online" ? "Online agora" : "Ativos 7 dias"}
          </button>
        ))}
        {INACTIVITY_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => {
              setActivityFilter(o.key);
              setPage(0);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${
              activityFilter === o.key ? "bg-amber-500/25 text-amber-200" : "glass text-white/55"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="glass rounded-xl flex items-center gap-2 px-3 py-2 flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-white/45 shrink-0" />
          <input
            value={searchEmail}
            onChange={(e) => {
              setSearchEmail(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por e-mail..."
            className="bg-transparent outline-none text-xs flex-1 min-w-0 placeholder:text-white/40"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="glass rounded-xl px-2.5 text-xs bg-transparent outline-none"
        >
          <option value="recent" className="bg-slate-800">Mais recente</option>
          <option value="oldest" className="bg-slate-800">Mais antigo</option>
          <option value="az" className="bg-slate-800">E-mail A-Z</option>
          <option value="za" className="bg-slate-800">E-mail Z-A</option>
        </select>
      </div>

      <p className="text-[11px] text-white/45">
        {filtered.length} usuário{filtered.length !== 1 ? "s" : ""} · página {page + 1} de {totalPages}
      </p>

      <div className="flex flex-col gap-1.5">
        {allowMessaging && pageItems.length > 0 && (
          <button
            onClick={selectAllOnPage}
            className="text-[11px] text-sky-300 font-semibold self-start mb-0.5"
          >
            {pageItems.every((u) => selected.has(u.uid)) ? "Desmarcar todos desta página" : "Selecionar todos desta página"}
          </button>
        )}

        {pageItems.map((u) => {
          const isOnline = u.lastActiveAt && now - u.lastActiveAt < ONLINE_THRESHOLD_MS;
          const isSelf = u.uid === currentUser.uid;
          const daysSinceActive = u.lastActiveAt ? Math.floor((now - u.lastActiveAt) / DAY_MS) : null;
          return (
            <div
              key={u.uid}
              className={`glass rounded-xl p-2.5 flex items-center gap-2.5 ${
                u.suspended || u.blocked ? "opacity-60" : ""
              }`}
            >
              {allowMessaging && (
                <button
                  onClick={() => toggleSelect(u.uid)}
                  className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center ${
                    selected.has(u.uid) ? "bg-sky-400 border-sky-400" : "border-white/25"
                  }`}
                  aria-label="Selecionar"
                >
                  {selected.has(u.uid) && <Check className="w-3 h-3 text-slate-900" />}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold truncate">{u.email}</p>
                  {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  {u.blocked && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/25 text-red-300 shrink-0">
                      Bloqueado
                    </span>
                  )}
                  {u.suspended && !u.blocked && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">
                      Suspenso
                    </span>
                  )}
                  {daysSinceActive != null && daysSinceActive >= 30 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">
                      Inativo há {daysSinceActive}d
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/45">
                  {u.role === "admin" ? "Admin" : "Usuário"}
                  {u.createdAt && ` · desde ${new Date(u.createdAt).toLocaleDateString("pt-BR")}`}
                  {u.currentStreak > 0 && ` · 🔥${u.currentStreak}`}
                </p>
              </div>

              {!isSelf && (
                <>
                  {confirmDeleteUid === u.uid ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-white/60">Excluir?</span>
                      <button
                        onClick={() => handleDelete(u.uid)}
                        disabled={busyUid === u.uid}
                        className="bg-red-500/80 text-white text-[10px] font-semibold rounded-full px-2 py-1"
                      >
                        {busyUid === u.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sim"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUid(null)}
                        className="glass rounded-full px-2 py-1 text-[10px] text-white/60"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleSuspend(u)}
                        className="glass rounded-full p-1.5 shrink-0"
                        aria-label={u.suspended ? "Reativar" : "Suspender"}
                        title={u.suspended ? "Reativar (suspensão)" : "Suspender"}
                      >
                        {u.suspended ? (
                          <ShieldOff className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Ban className="w-3.5 h-3.5 text-amber-300" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleBlock(u)}
                        disabled={busyUid === u.uid}
                        className="glass rounded-full p-1.5 shrink-0"
                        aria-label={u.blocked ? "Desbloquear" : "Bloquear"}
                        title={u.blocked ? "Desbloquear login" : "Bloquear login (mais forte que suspender)"}
                      >
                        {busyUid === u.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldAlert className={`w-3.5 h-3.5 ${u.blocked ? "text-emerald-300" : "text-red-300"}`} />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUid(u.uid)}
                        className="glass rounded-full p-1.5 shrink-0"
                        aria-label="Excluir permanentemente"
                        title="Excluir permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-300" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
        {pageItems.length === 0 && (
          <p className="text-center text-xs text-white/45 py-6">Nenhum usuário encontrado com esses filtros.</p>
        )}
      </div>

      {actionError && (
        <p className="text-xs text-red-300 bg-red-500/10 rounded-xl px-3 py-2">{actionError}</p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs text-white/60 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-[11px] text-white/45">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs text-white/60 disabled:opacity-30"
          >
            Próxima
          </button>
        </div>
      )}

      {allowMessaging && (
        <div className="glass-strong rounded-2xl p-3.5 mt-2 flex flex-col gap-2.5">
          <p className="text-[11px] text-white/60">
            {selected.size === 0
              ? "Selecione ao menos um usuário acima para enviar mensagem individual ou em grupo."
              : `${selected.size} usuário${selected.size > 1 ? "s" : ""} selecionado${selected.size > 1 ? "s" : ""}.`}
          </p>

          <div className="flex gap-1 p-1 bg-black/25 rounded-full">
            <button
              onClick={() => setChannel("app")}
              className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1.5 ${
                channel === "app" ? "bg-white/15 text-white" : "text-white/55"
              }`}
            >
              <Send className="w-3 h-3" /> Dentro do app
            </button>
            <button
              onClick={() => setChannel("push")}
              className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1.5 ${
                channel === "push" ? "bg-white/15 text-white" : "text-white/55"
              }`}
            >
              <BellRing className="w-3 h-3" /> Notificação push
            </button>
          </div>
          {channel === "push" && (
            <p className="text-[10px] text-amber-300/80">
              Só chega para quem já ativou notificações push — quem não ativou é contado, nunca fingido como enviado.
            </p>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva a mensagem para os selecionados..."
            rows={2}
            className="bg-black/25 rounded-lg px-3 py-2 text-sm outline-none border border-white/5 focus:border-white/20 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !message.trim() || selected.size === 0}
            className="bg-white text-slate-900 text-sm font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar para {selected.size || "..."} selecionado{selected.size !== 1 ? "s" : ""}
          </button>
          {sent && (
            <p className="text-xs text-emerald-300 text-center">
              Enviado com sucesso.{sendResultNote && ` ${sendResultNote}.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
