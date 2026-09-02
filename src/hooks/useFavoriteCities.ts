import { useEffect, useState, useCallback } from "react";
import { db, doc, getDoc, setDoc } from "../lib/firebase";
import type { FavoriteCity } from "../types";

const MAX_FAVORITES = 6;

export function useFavoriteCities(uid: string | null) {
  const [favorites, setFavorites] = useState<FavoriteCity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (cancelled) return;
      const data = snap.exists() ? snap.data() : {};
      setFavorites(data.favoriteCities ?? []);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const addFavorite = useCallback(
    async (city: Omit<FavoriteCity, "id">) => {
      if (!uid) return { ok: false, reason: "not_logged_in" as const };
      if (favorites.length >= MAX_FAVORITES) {
        return { ok: false, reason: "limit_reached" as const };
      }
      // Evita duplicar a mesma cidade (mesma coordenada aproximada).
      const exists = favorites.some(
        (f) => Math.abs(f.lat - city.lat) < 0.01 && Math.abs(f.lon - city.lon) < 0.01,
      );
      if (exists) return { ok: false, reason: "already_saved" as const };

      const newFavorite: FavoriteCity = { ...city, id: crypto.randomUUID() };
      const updated = [...favorites, newFavorite];
      await setDoc(doc(db, "users", uid), { favoriteCities: updated }, { merge: true });
      setFavorites(updated);
      return { ok: true as const };
    },
    [uid, favorites],
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      if (!uid) return;
      const updated = favorites.filter((f) => f.id !== id);
      await setDoc(doc(db, "users", uid), { favoriteCities: updated }, { merge: true });
      setFavorites(updated);
    },
    [uid, favorites],
  );

  return { favorites, loaded, addFavorite, removeFavorite, maxFavorites: MAX_FAVORITES };
}
