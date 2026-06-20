"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  evaluationId: string;
}

export default function StartExamButton({ evaluationId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/evaluations/${evaluationId}/start`, { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al iniciar el examen");
      return;
    }

    // Persiste el payload en sessionStorage para que el exam page lo lea
    sessionStorage.setItem(`exam_${evaluationId}`, JSON.stringify(data));
    router.push(`/dashboard/evaluations/${evaluationId}/exam`);
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Preparando examen..." : "Iniciar examen"}
      </button>
    </div>
  );
}
