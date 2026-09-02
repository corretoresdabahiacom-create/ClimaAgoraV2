import { useEffect, useState } from "react";
import { db, doc, getDoc, setDoc } from "../lib/firebase";
import { ACHIEVEMENTS } from "../lib/achievements";
import type { WeatherData } from "../types";

export function useAchievements(uid: string | null, weather: WeatherData | null, streak: number) {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !weather) return;
    let cancelled = false;

    (async () => {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const already: string[] = snap.exists() ? snap.data().unlockedAchievements ?? [] : [];

      const hour = new Date().getHours();
      const newlyUnlocked = ACHIEVEMENTS.filter(
        (a) => !already.includes(a.id) && a.check({ weather, streak, hour }),
      );

      if (newlyUnlocked.length > 0) {
        const updated = [...already, ...newlyUnlocked.map((a) => a.id)];
        await setDoc(ref, { unlockedAchievements: updated }, { merge: true });
        if (!cancelled) {
          setUnlocked(updated);
          setJustUnlocked(newlyUnlocked[0].id); // mostra só uma por vez, a mais recente
        }
      } else if (!cancelled) {
        setUnlocked(already);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Roda de novo sempre que o clima real mudar (ex: trocou de cidade,
    // ou a condição mudou) — nunca em loop, já que cada conquista só
    // desbloqueia uma vez e fica marcada permanentemente.
  }, [uid, weather?.weatherCode, weather?.feelsLike, weather?.temp, streak]);

  return { unlocked, justUnlocked, dismissJustUnlocked: () => setJustUnlocked(null) };
}
