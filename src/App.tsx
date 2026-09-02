import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { LoginScreen } from "./components/LoginScreen";
import { TermsScreen } from "./components/TermsScreen";
import { HomeScreen } from "./components/HomeScreen";
import { AdminScreen } from "./components/AdminScreen";
import { SuspendedScreen } from "./components/SuspendedScreen";
import { TERMS_VERSION } from "./types";

export default function App() {
  const { firebaseUser, appUser, loading } = useAuth();
  const [view, setView] = useState<"home" | "admin">("home");

  useHeartbeat(appUser?.termsAcceptedAt ? appUser.uid : null);

  if (loading) {
    return (
      <div className="sky-clear-night min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    );
  }

  if (!firebaseUser || !appUser) {
    return <LoginScreen />;
  }

  // Verificado ANTES de qualquer outra tela (inclusive antes dos termos e
  // do admin) — uma conta suspensa não deve ver nada além deste aviso,
  // mesmo que seja tecnicamente um admin.
  if (appUser.suspended) {
    return <SuspendedScreen email={appUser.email} />;
  }

  if (!appUser.termsAcceptedAt || appUser.termsVersion !== TERMS_VERSION) {
    return <TermsScreen uid={appUser.uid} />;
  }

  if (view === "admin" && appUser.role === "admin") {
    return <AdminScreen currentUser={appUser} onBack={() => setView("home")} />;
  }

  return <HomeScreen user={appUser} onOpenAdmin={() => setView("admin")} />;
}
