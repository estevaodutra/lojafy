import React from "react";
import { Sparkles, CheckCircle2, X, RotateCcw } from "lucide-react";
import { useSystemUpdate } from "@/hooks/useSystemUpdate";

export const SystemUpdateNotification: React.FC = () => {
  const { availableUpdate, isReloading, dismissUpdate, applyUpdate } = useSystemUpdate();

  if (!availableUpdate) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] w-[calc(100vw-2rem)] sm:w-[420px] max-w-[440px] pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#111622] text-slate-100 rounded-2xl border border-[#23293e] shadow-2xl shadow-black/80 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon with green status dot */}
          <div className="relative shrink-0 w-10 h-10 rounded-xl bg-[#1b2135] border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111622]" />
          </div>

          {/* Title, Badge & Commit Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm sm:text-[15px] tracking-tight">
                O sistema foi atualizado!
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-[11px] font-medium leading-none">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Git push OK
              </span>
            </div>

            {/* Commit Message */}
            <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed mt-2 line-clamp-2 break-words">
              {availableUpdate.message || "Nova atualização disponível"}
            </p>

            {/* Commit Hash & Author */}
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="inline-flex items-center gap-1 bg-[#1a2033] border border-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono leading-none">
                <span>&rarr;</span>
                <span>{availableUpdate.shortHash || availableUpdate.hash.slice(0, 7)}</span>
              </span>
              <span className="text-slate-400 text-xs truncate">
                por {availableUpdate.author || "estevaodutra"}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismissUpdate}
            className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer -mr-1 -mt-1"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-[#23293e]/80 my-3.5" />

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={dismissUpdate}
            className="text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-medium px-3 py-1.5 transition-colors cursor-pointer"
          >
            Depois
          </button>

          <button
            type="button"
            disabled={isReloading}
            onClick={applyUpdate}
            className="bg-[#6344f5] hover:bg-[#5233e4] active:scale-[0.98] disabled:opacity-70 text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReloading ? "animate-spin" : ""}`} />
            <span>{isReloading ? "Atualizando..." : "Atualizar agora"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default SystemUpdateNotification;
