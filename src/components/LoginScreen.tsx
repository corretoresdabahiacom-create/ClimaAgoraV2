import { useState } from "react";
import { CloudSun, Mail, Lock, Loader2 } from "lucide-react";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  googleProvider,
} from "../lib/firebase";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado. Tente entrar.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/popup-closed-by-user": "Login com Google cancelado.",
  "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco antes de tentar de novo.",
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] || "Não foi possível entrar. Tente novamente.";
}

export function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleForgotPassword() {
    setError(null);
    setResetSent(false);
    if (!email.trim()) {
      setError("Digite seu e-mail no campo acima primeiro, depois clique em \"Esqueci minha senha\".");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setResetting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sky-clear-night relative min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center">
            <CloudSun className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ClimaAgora</h1>
          <p className="text-sm text-white/50">Clima e alertas oficiais, sem enrolação.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex gap-1 p-1 bg-black/20 rounded-full mb-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                mode === "signin" ? "bg-white/15 text-white" : "text-white/50"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                mode === "signup" ? "bg-white/15 text-white" : "text-white/50"
              }`}
            >
              Criar conta
            </button>
          </div>

          <label className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3">
            <Mail className="w-4 h-4 text-white/58" />
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-white/58"
            />
          </label>

          <label className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3">
            <Lock className="w-4 h-4 text-white/58" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-white/58"
            />
          </label>

          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="self-end text-xs text-white/50 underline underline-offset-2 -mt-1 disabled:opacity-50"
            >
              {resetting ? "Enviando..." : "Esqueci minha senha"}
            </button>
          )}

          {resetSent && (
            <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Link de redefinição enviado para {email}. Confira sua caixa de
              entrada (e o spam).
            </p>
          )}

          {error && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-white text-slate-900 font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[11px] text-white/48">ou</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="bg-black/20 border border-white/10 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            Continuar com Google
          </button>
        </form>
      </div>
    </div>
  );
}
