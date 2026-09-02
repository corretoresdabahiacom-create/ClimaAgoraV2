import { useEffect } from "react";
import { db, doc, updateDoc, serverTimestamp } from "../lib/firebase";

const HEARTBEAT_INTERVAL_MS = 30_000;

// "Online agora" é definido, de forma honesta, como "teve uma pulsação
// nos últimos 60 segundos" — não é presença instantânea de verdade (isso
// exigiria o Firebase Realtime Database com onDisconnect, um produto
// separado), mas é um dado REAL, não uma estimativa nem um número
// decorativo: se o app estiver aberto, o timestamp é atualizado; se não
// estiver, o timestamp para de avançar e a pessoa deixa de contar como
// online dentro dessa janela.
export const ONLINE_THRESHOLD_MS = 60_000;

export function useHeartbeat(uid: string | null) {
  useEffect(() => {
    if (!uid) return;

    const beat = () => {
      updateDoc(doc(db, "users", uid), { lastActiveAt: serverTimestamp() }).catch(() => {
        // Falha de heartbeat não deve quebrar a experiência do usuário.
      });
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [uid]);
}
