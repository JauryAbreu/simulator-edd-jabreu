"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";

export interface TagStat {
  tag: string;
  correct: number;
  total: number;
  pct: number;
}

interface Props {
  data: TagStat[];
}

function barColor(pct: number) {
  if (pct >= 70) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

export function TagPerformanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
        Sin datos de categorías. Asigna etiquetas a las preguntas para ver este gráfico.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => b.pct - a.pct);

  return (
    <div role="img" aria-label="Rendimiento por categoría">
      <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 44)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:[&>*]:stroke-slate-700" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            stroke="#94a3b8"
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="tag"
            width={120}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            stroke="#94a3b8"
          />
          <Tooltip
            formatter={(value, _name, entry) => [
              `${value}% (${entry.payload.correct}/${entry.payload.total})`,
              "Correctas",
            ]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {sorted.map((entry) => (
              <Cell key={entry.tag} fill={barColor(entry.pct)} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: unknown) => `${v ?? 0}%`}
              style={{ fontSize: 11, fill: "#94a3b8" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Accessible fallback table */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
          Ver datos en tabla
        </summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1 font-medium text-gray-600 dark:text-slate-400">Categoría</th>
              <th className="text-center py-1 font-medium text-gray-600 dark:text-slate-400">Correctas</th>
              <th className="text-center py-1 font-medium text-gray-600 dark:text-slate-400">Total</th>
              <th className="text-center py-1 font-medium text-gray-600 dark:text-slate-400">%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.tag} className="border-t border-gray-100 dark:border-slate-700">
                <td className="py-1">{d.tag}</td>
                <td className="text-center">{d.correct}</td>
                <td className="text-center">{d.total}</td>
                <td className="text-center font-semibold" style={{ color: barColor(d.pct) }}>
                  {d.pct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
