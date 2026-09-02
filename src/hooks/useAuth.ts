import { useEffect, useState } from "react";
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged,
  onSnapshot,
  type User,
} from "../lib/firebase";
import type { AppUser } from "../types";

interface AuthState {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      // Cria o documento do usuário na primeira vez que ele loga —
      // sempre com role "user" por padrão. Promoção a admin é feita
      // manualmente no Firestore (nunca automática, nunca por e-mail).
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: "user",
          termsAcceptedAt: null,
          termsVersion: null,
          createdAt: new Date().toISOString(),
          suspended: false,
        });
      }

      // Escuta em tempo real para refletir mudanças de role/termos
      // (ex: um admin promovendo o usuário) sem precisar recarregar.
      const unsubDoc = onSnapshot(userRef, (docSnap) => {
        const data = docSnap.data();
        setAppUser({
          uid: user.uid,
          email: user.email,
          role: data?.role === "admin" ? "admin" : "user",
          termsAcceptedAt: data?.termsAcceptedAt ?? null,
          termsVersion: data?.termsVersion ?? null,
          suspended: data?.suspended === true,
        });
        setLoading(false);
      });

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, []);

  return { firebaseUser, appUser, loading };
}
