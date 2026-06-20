import Link from "next/link";

type Variant = "success" | "danger" | "info" | "warning" | "neutral";

interface StatCardProps {
  label: string;
  /** Main display value, e.g. "184/210" or "87%" or "12" */
  value: string;
  subtext?: string;
  /** 0-100, drives the thin color bar */
  percentage?: number;
  variant?: Variant;
  href?: string;
}

const barColor: Record<Variant, string> = {
  success: "var(--color-success)",
  danger:  "var(--color-danger)",
  warning: "var(--color-warning)",
  info:    "var(--color-info)",
  neutral: "#64748b",
};

export function StatCard({ label, value, subtext, percentage, variant = "neutral", href }: StatCardProps) {
  const bar = percentage !== undefined ? Math.min(100, Math.max(0, percentage)) : null;

  const body = (
    <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900 p-5 flex flex-col gap-1"
      style={{ borderColor: "var(--border-color)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {subtext && (
        <p className="text-xs" style={{ color: "var(--text-subtle)" }}>{subtext}</p>
      )}
      {bar !== null && (
        <div className="mt-3 h-1 w-full rounded-full" style={{ background: "var(--border-color)" }}>
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ width: `${bar}%`, background: barColor[variant] }}
            role="progressbar"
            aria-valuenow={bar}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:shadow-md transition-shadow rounded-xl">
        {body}
      </Link>
    );
  }
  return body;
}
