import { MapPin, Search } from "lucide-react";

interface Props {
  onAllow: () => void;
  onSkip: () => void;
}

export function LocationConsentScreen({ onAllow, onSkip }: Props) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center w-full">
      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
        <MapPin className="w-7 h-7 text-sky-300" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-semibold text-base">Usar sua localização</p>
        <p className="text-sm text-white/65 mt-2 max-w-xs leading-relaxed">
          O ClimaAgora pede acesso à sua localização apenas para mostrar o
          clima e os alertas oficiais da sua região automaticamente.
          Sua localização não é armazenada nem compartilhada — é usada só
          no momento da consulta.
        </p>
      </div>
      <button
        onClick={onAllow}
        className="bg-white text-slate-900 text-sm font-semibold rounded-xl px-6 py-3 w-full max-w-xs"
      >
        Permitir localização
      </button>
      <button
        onClick={onSkip}
        className="flex items-center gap-1.5 text-xs text-white/60 underline underline-offset-2"
      >
        <Search className="w-3.5 h-3.5" />
        Prefiro buscar minha cidade manualmente
      </button>
    </div>
  );
}
