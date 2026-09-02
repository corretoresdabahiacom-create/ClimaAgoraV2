import { useEffect, useState } from "react";
import { db, doc, getDoc, setDoc } from "../lib/firebase";
import {
  checkThresholds,
  DEFAULT_ALERT_PREFERENCES,
  type AlertPreferences,
  type TriggeredAlert,
} from "../lib/alertPreferences";
import type { WeatherData } from "../types";

export function useAlertPreferences(uid: string | null, weather: WeatherData | null) {
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_ALERT_PREFERENCES);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (cancelled) return;
      const data = snap.exists() ? snap.data() : {};
      setPrefs({ ...DEFAULT_ALERT_PREFERENCES, ...(data.alertPreferences ?? {}) });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!weather) return;
    setTriggered(checkThresholds(prefs, weather));
  }, [prefs, weather]);

  async function savePreferences(newPrefs: AlertPreferences) {
    if (!uid) return;
    await setDoc(doc(db, "users", uid), { alertPreferences: newPrefs }, { merge: true });
    setPrefs(newPrefs);
  }

  return { prefs, triggered, savePreferences };
}
