"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface AttemptBar {
  label: string;
  correctas: number;
  incorrectas: number;
  sinResponder: number;
}

interface Props {
  data: AttemptBar[];
}

const COLORS = { correctas: "#22c55e", incorrectas: "#ef4444", sinResponder: "#94a3b8" };

export function AttemptDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">Sin datos</p>;
  }

  return (
    <div role="img" aria-label="Distribución de respuestas por intento">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="#94a3b8" />
          <Tooltip
            formatter={(v, name) => [v ?? 0, name === "sinResponder" ? "Sin responder" : name]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
          <Bar dataKey="correctas" fill={COLORS.correctas} radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="incorrectas" fill={COLORS.incorrectas} radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="sinResponder" fill={COLORS.sinResponder} radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
