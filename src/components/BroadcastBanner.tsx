import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { db, collection, query, where, orderBy, limit, onSnapshot } from "../lib/firebase";
import type { Broadcast } from "../types";

// Mostra o aviso mais recente que se aplica a ESTE usuário — seja um
// aviso geral (sem targetUids, comportamento original) ou um aviso
// direcionado especificamente a ele (targetUids contém o uid dele).
// São duas consultas reais separadas (Firestore não permite "campo nulo
// OU array-contains" numa única query), combinadas aqui no cliente.
export function BroadcastBanner({ uid }: { uid: string }) {
  const [general, setGeneral] = useState<Broadcast[]>([]);
  const [targeted, setTargeted] = useState<Broadcast[]>([]);
  const [dismissedId, setDismissedId] = useState<string | null>(
    () => localStorage.getItem("dismissed_broadcast_id"),
  );

  useEffect(() => {
    const qGeneral = query(
      collection(db, "broadcasts"),
      where("targetUids", "==", null),
      orderBy("createdAt", "desc"),
      limit(5) as any,
    );
    const unsubGeneral = onSnapshot(qGeneral, (snap) => {
      setGeneral(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Broadcast));
    });

    const qTargeted = query(
      collection(db, "broadcasts"),
      where("targetUids", "array-contains", uid),
      orderBy("createdAt", "desc"),
      limit(5) as any,
    );
    const unsubTargeted = onSnapshot(qTargeted, (snap) => {
      setTargeted(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Broadcast));
    });

    return () => {
      unsubGeneral();
      unsubTargeted();
    };
  }, [uid]);

  const latest = [...general, ...targeted].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (!latest || latest.id === dismissedId) return null;

  return (
    <div className="px-5 mt-4">
      <div className="glass-strong rounded-2xl p-3.5 flex items-start gap-2.5 border border-sky-400/25">
        <Megaphone className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
        <p className="text-sm flex-1">{latest.message}</p>
        <button
          onClick={() => {
            localStorage.setItem("dismissed_broadcast_id", latest.id);
            setDismissedId(latest.id);
          }}
          aria-label="Dispensar aviso"
        >
          <X className="w-4 h-4 text-white/58" />
        </button>
      </div>
    </div>
  );
}
