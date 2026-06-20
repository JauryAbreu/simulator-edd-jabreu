"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  score: number;
  totalPoints: number;
  label: string;
}

interface Props {
  data: DataPoint[];
  className?: string;
}

export function ScoreEvolutionChart({ data, className }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">Sin datos suficientes</p>;
  }

  const avgScore = data.reduce((s, d) => s + d.score, 0) / data.length;

  return (
    <div className={className} role="img" aria-label="Gráfico de evolución del puntaje en el tiempo">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&>*]:stroke-slate-700" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            stroke="#94a3b8"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            stroke="#94a3b8"
          />
          <Tooltip
            formatter={(value, name) => [
              `${value ?? 0} pts`,
              name === "score" ? "Puntaje" : "Máximo",
            ]}
            labelFormatter={(label) => `Intento: ${label}`}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            y={avgScore}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: "Promedio", fontSize: 11, fill: "#f59e0b", position: "insideTopRight" }}
          />
          <Line
            type="monotone"
            dataKey="totalPoints"
            stroke="#e2e8f0"
            strokeWidth={1.5}
            dot={false}
            name="totalPoints"
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ fill: "#2563eb", r: 4 }}
            activeDot={{ r: 6 }}
            name="score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
