import { Card, CardContent } from "@/components/ui/card"
import { ReactNode } from "react"

type Props = {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  delta?: string
  deltaPositiveIsBad?: boolean
  compact?: boolean
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  delta,
  deltaPositiveIsBad = false,
  compact = false,
}: Props) {
  const isPositive = delta?.startsWith("+")
  const deltaClass = !delta
    ? ""
    : isPositive
    ? deltaPositiveIsBad
      ? "text-red-600"
      : "text-emerald-600"
    : deltaPositiveIsBad
    ? "text-emerald-600"
    : "text-red-600"

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className={compact ? "p-4" : "p-5"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{title}</p>
            <p
              className={`mt-1 font-semibold tracking-tight text-slate-900 ${
                compact ? "text-2xl" : "text-3xl"
              }`}
            >
              {value}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {delta ? (
                <span className={`text-xs font-medium ${deltaClass}`}>{delta}</span>
              ) : null}
              {subtitle ? (
                <p className="text-xs text-slate-500">{subtitle}</p>
              ) : null}
            </div>
          </div>

          {icon ? (
            <div
              className={`shrink-0 rounded-2xl bg-slate-100 text-slate-700 ${
                compact ? "p-2.5" : "p-3"
              }`}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}