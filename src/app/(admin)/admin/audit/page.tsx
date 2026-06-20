"use client";

import { useState, useEffect, useCallback } from "react";

interface LogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-900/50 text-green-300",
  UPDATE: "bg-blue-900/50 text-blue-300",
  DELETE: "bg-red-900/50 text-red-300",
  IMPORT: "bg-purple-900/50 text-purple-300",
  LOGIN: "bg-slate-700 text-slate-300",
  RESET_PASSWORD: "bg-orange-900/50 text-orange-300",
};

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.includes(k));
  return key ? ACTION_COLORS[key] : "bg-slate-700 text-slate-400";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(1); }, [load]);

  function go(p: number) {
    if (p < 1 || p > pages) return;
    load(p);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Auditoría</h1>
        <span className="text-sm text-slate-400">{total.toLocaleString()} registros</span>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : (
        <>
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
                  aria-expanded={expanded === log.id}
                >
                  <span className="shrink-0 text-xs text-slate-500 font-mono w-36">
                    {new Date(log.createdAt).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{log.entityType}</span>
                  <span className="flex-1 text-xs text-slate-200 truncate">{log.entityId}</span>
                  <span className="shrink-0 text-xs text-slate-500">por {log.actorUsername}</span>
                  <svg className={`shrink-0 w-3 h-3 text-slate-500 mt-0.5 transition-transform ${expanded === log.id ? "rotate-180" : ""}`} viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z" /></svg>
                </button>
                {expanded === log.id && log.metadata && (
                  <div className="border-t border-slate-700 bg-slate-950 px-4 py-3">
                    <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-12">Sin registros de auditoría aún.</p>
            )}
          </div>

          {pages > 1 && (
            <nav aria-label="Paginación de auditoría" className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => go(page - 1)} disabled={page === 1} aria-label="Página anterior"
                className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors">
                ← Anterior
              </button>
              <span className="text-sm text-slate-400">Página {page} de {pages}</span>
              <button onClick={() => go(page + 1)} disabled={page === pages} aria-label="Página siguiente"
                className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors">
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
