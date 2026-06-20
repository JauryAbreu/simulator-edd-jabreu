"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { date: string; count: number }[];
}

export function UsageChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">Sin datos</p>;
  }

  return (
    <div role="img" aria-label="Gráfico de intentos por día">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="#94a3b8" allowDecimals={false} />
          <Tooltip
            formatter={(v) => [v ?? 0, "Intentos"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
          />
          <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#usageGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
