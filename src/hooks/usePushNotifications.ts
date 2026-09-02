import { useCallback, useEffect, useRef, useState } from "react";
import {
  app,
  db,
  doc,
  getDoc,
  setDoc,
  getMessaging,
  getFcmToken,
  onMessage,
  isMessagingSupported,
  VAPID_KEY,
} from "../lib/firebase";

// browserPermission = o que o navegador reporta (default/granted/denied) —
// uma vez concedida ou negada, só o próprio usuário consegue mudar isso
// nas configurações do navegador, nunca via código. NENHUM site consegue
// pular essa pergunta do navegador — é proteção de segurança do
// Chrome/Firefox/Safari, não uma limitação nossa.
//
// appEnabled = preferência DENTRO do nosso app.
// pushDisabledByUser = o usuário já disse explicitamente que não quer —
// diferente de "nunca decidiu ainda" (permite avisar no login só quando
// foi uma escolha ativa, e não tentar ativar sozinho de novo).
export type PushStatus = "unsupported" | "loading" | "default" | "denied" | "enabled" | "disabled";

const AUTO_PROMPT_KEY = "climaagora_push_auto_prompted";

export function usePushNotifications(uid: string | null) {
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported" | "loading">(
    "loading",
  );
  const [appEnabled, setAppEnabled] = useState(false);
  const [disabledByUser, setDisabledByUser] = useState(false);
  const autoAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    isMessagingSupported().then((supported) => {
      if (cancelled) return;
      if (!supported || typeof Notification === "undefined") {
        setBrowserPermission("unsupported");
        return;
      }
      setBrowserPermission(Notification.permission);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Carrega a preferência real do app a partir do Firestore.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (cancelled) return;
      const data = snap.exists() ? snap.data() : {};
      const tokens: string[] = data.fcmTokens ?? [];
      setAppEnabled(tokens.length > 0);
      setDisabledByUser(data.pushDisabledByUser === true);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const status: PushStatus =
    browserPermission === "loading"
      ? "loading"
      : browserPermission === "unsupported"
        ? "unsupported"
        : browserPermission === "denied"
          ? "denied"
          : browserPermission === "granted" && appEnabled
            ? "enabled"
            : browserPermission === "granted" && !appEnabled
              ? "disabled"
              : "default";

  // Enquanto o app está ABERTO e em foco, mensagens chegam por aqui
  // (não pelo service worker, que só trata em segundo plano/fechado).
  useEffect(() => {
    if (status !== "enabled") return;
    let unsub: (() => void) | undefined;
    isMessagingSupported().then((supported) => {
      if (!supported) return;
      const messaging = getMessaging(app);
      unsub = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || "ClimaAgora";
        const body = payload.notification?.body || "";
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icon-192.png" });
        }
      });
    });
    return () => unsub?.();
  }, [status]);

  const enable = useCallback(async () => {
    if (!uid) return { ok: false, reason: "not_logged_in" as const };
    const supported = await isMessagingSupported();
    if (!supported) return { ok: false, reason: "unsupported" as const };
    if (!VAPID_KEY) return { ok: false, reason: "missing_vapid_key" as const };

    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission !== "granted") return { ok: false, reason: "denied" as const };

    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const messaging = getMessaging(app);
      const token = await getFcmToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (!token) return { ok: false, reason: "no_token" as const };

      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const existing: string[] = snap.exists() ? snap.data().fcmTokens ?? [] : [];
      if (!existing.includes(token)) {
        await setDoc(ref, { fcmTokens: [...existing, token], pushDisabledByUser: false }, { merge: true });
      } else {
        await setDoc(ref, { pushDisabledByUser: false }, { merge: true });
      }
      setAppEnabled(true);
      setDisabledByUser(false);
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false, reason: "error" as const, error: String(err?.message || err) };
    }
  }, [uid]);

  // Ativação automática, silenciosa, na primeira vez que este DISPOSITIVO
  // é usado — representa "vem ativado por padrão". Só o navegador decide
  // se mostra o próprio prompt nativo pra pessoa; nunca conseguimos
  // pular essa etapa dele. Guardamos "já tentei" no localStorage (por
  // APARELHO, já que permissão de notificação é do navegador, não da
  // conta) e "usuário desativou de propósito" no Firestore (por CONTA,
  // pra não insistir de novo se ela já disse que não quer).
  useEffect(() => {
    if (!uid || autoAttemptedRef.current) return;
    if (browserPermission !== "default") return; // já decidiu antes (concedeu/negou no navegador)
    if (disabledByUser) return; // já escolheu desativar de propósito -> não insiste
    if (localStorage.getItem(AUTO_PROMPT_KEY) === "1") return; // já tentou neste aparelho antes

    autoAttemptedRef.current = true;
    localStorage.setItem(AUTO_PROMPT_KEY, "1");
    enable();
  }, [uid, browserPermission, disabledByUser, enable]);

  // Desativa DENTRO do app: registra que foi uma escolha ATIVA do
  // usuário (pra podermos avisar de forma honesta no próximo login,
  // sem inventar re-tentativas automáticas depois disso).
  const disable = useCallback(async () => {
    if (!uid) return { ok: false as const };
    try {
      await setDoc(doc(db, "users", uid), { fcmTokens: [], pushDisabledByUser: true }, { merge: true });
      setAppEnabled(false);
      setDisabledByUser(true);
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  }, [uid]);

  return { status, disabledByUser, enable, disable };
}
