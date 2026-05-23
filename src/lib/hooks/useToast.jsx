// src/lib/hooks/useToast.jsx
import { createContext, useContext, useMemo, useState, useCallback } from "react";

const ToastCtx = createContext(null);

const toneStyles = {
  success: {
    border: "border-emerald-200",
    accent: "bg-emerald-500",
    title: "text-emerald-950",
  },
  error: {
    border: "border-rose-200",
    accent: "bg-rose-500",
    title: "text-rose-950",
  },
  info: {
    border: "border-blue-200",
    accent: "bg-blue-500",
    title: "text-blue-950",
  },
  default: {
    border: "border-slate-200",
    accent: "bg-slate-500",
    title: "text-slate-950",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t) => {
      const id =
        (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
        String(Date.now() + Math.random());
      const ttl = t.duration ?? 3500;
      const toast = {
        id,
        title: t.title ?? "",
        description: t.description ?? "",
        tone: t.tone ?? "success",
      };
      setToasts((xs) => [...xs, toast]);
      const timer = setTimeout(() => remove(id), ttl);
      return () => clearTimeout(timer);
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      toast:   (opts) => push({ ...opts, tone: opts.tone ?? "default" }),
      success: (msg, opts = {}) => push({ title: "Success", description: msg, tone: "success", ...opts }),
      error:   (msg, opts = {}) => push({ title: "Error",   description: msg, tone: "error",   ...opts }),
      info:    (msg, opts = {}) => push({ title: "Info",    description: msg, tone: "info",    ...opts }),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:w-auto"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => {
          const styles = toneStyles[t.tone] || toneStyles.default;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={[
                "pointer-events-auto grid grid-cols-[0.25rem_minmax(0,1fr)] overflow-hidden rounded-xl border bg-white/95 text-sm shadow-xl backdrop-blur",
                "animate-in fade-in slide-in-from-top-2 zoom-in-95 motion-reduce:animate-none",
                styles.border,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.accent} aria-hidden="true" />
              <div className="px-3 py-2.5">
                {t.title ? (
                  <div className={`mb-0.5 text-sm font-semibold ${styles.title}`}>
                    {t.title}
                  </div>
                ) : null}
                {t.description ? (
                  <div className="leading-5 text-slate-600">{t.description}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
