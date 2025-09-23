// src/lib/hooks/useToast.jsx
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t) => {
      const id = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());
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
      <div className="fixed right-4 top-4 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "min-w-[260px] max-w-[360px] rounded-lg px-3 py-2 shadow-md border text-sm backdrop-blur bg-white/95",
              t.tone === "success" && "border-green-200",
              t.tone === "error"   && "border-red-200",
              t.tone === "info"    && "border-blue-200",
              t.tone === "default" && "border-slate-200",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {t.title ? <div className="font-medium mb-0.5">{t.title}</div> : null}
            {t.description ? <div className="text-slate-600">{t.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
