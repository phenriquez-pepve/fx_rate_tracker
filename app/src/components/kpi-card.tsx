import { Card, CardContent } from "@/components/ui/card"
import { type ReactNode } from "react"

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
  const valueClass = !delta
    ? "text-slate-900"
    : isPositive
    ? deltaPositiveIsBad
      ? "text-red-600"
      : "text-emerald-600"
    : deltaPositiveIsBad
    ? "text-emerald-600"
    : "text-red-600"

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="absolute left-0 top-0 h-full w-0.5 bg-blue-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <CardContent className={compact ? "px-3.5 py-3" : "px-4 py-3.5"}>
        <div className="flex items-start gap-3">
          {icon ? (
            <div
              className={`shrink-0 rounded-2xl bg-slate-100 text-slate-700 ${
                compact ? "p-2" : "p-2.5"
              }`}
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">{title}</p>

            <p
              className={`mt-0.5 font-semibold leading-none tracking-tight ${
                compact ? "text-[1.65rem]" : "text-[1.9rem]"
              } ${valueClass}`}
            >
              {value}
            </p>

            {subtitle ? (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
