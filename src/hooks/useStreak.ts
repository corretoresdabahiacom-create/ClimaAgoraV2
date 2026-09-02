import { useEffect, useState } from "react";
import { db, doc, getDoc, setDoc } from "../lib/firebase";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD, fuso local do dispositivo
}

function daysBetween(a: string, b: string): number {
  const diffMs = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(diffMs / 86_400_000);
}

// Ofensiva de consistência: conta dias consecutivos REAIS em que o
// usuário abriu o app — não é fabricado, é literalmente a contagem de
// visitas em dias diferentes, com continuidade quebrada se ele pular
// um dia. Gravado no Firestore para persistir entre sessões/aparelhos.
export function useStreak(uid: string | null): StreakData | null {
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};

      const today = todayStr();
      const lastCheckIn: string | null = data.lastCheckInDate ?? null;
      let currentStreak: number = data.currentStreak ?? 0;
      let longestStreak: number = data.longestStreak ?? 0;

      if (lastCheckIn === today) {
        // Já contabilizado hoje — não faz nada, só carrega o valor atual.
      } else if (lastCheckIn && daysBetween(lastCheckIn, today) === 1) {
        // Veio no dia seguinte ao último check-in -> continua a sequência.
        currentStreak += 1;
      } else {
        // Primeira vez, ou pulou um ou mais dias -> reinicia em 1.
        currentStreak = 1;
      }

      longestStreak = Math.max(longestStreak, currentStreak);

      if (lastCheckIn !== today) {
        await setDoc(
          ref,
          { currentStreak, longestStreak, lastCheckInDate: today },
          { merge: true },
        );
      }

      if (!cancelled) setStreak({ currentStreak, longestStreak, lastCheckInDate: today });
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return streak;
}
