import { Ban } from "lucide-react";
import { signOut } from "../lib/firebase";

export function SuspendedScreen({ email }: { email: string | null }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="glass rounded-3xl p-6 max-w-sm w-full text-center flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
          <Ban className="w-7 h-7 text-red-300" />
        </div>
        <h1 className="text-lg font-bold">Conta suspensa</h1>
        <p className="text-sm text-white/60 leading-relaxed">
          O acesso da conta <strong className="text-white/85">{email}</strong> foi suspenso
          por um administrador. Se você acredita que isso é um engano, entre em contato
          pelo e-mail{" "}
          <a href="mailto:admmeuarmazem@gmail.com" className="text-sky-300 underline">
            admmeuarmazem@gmail.com
          </a>
          .
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 bg-white text-slate-900 text-sm font-semibold rounded-xl px-5 py-2.5"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
