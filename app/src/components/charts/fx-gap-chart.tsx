"use client"

import { useMemo } from "react"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts"

type Props = {
  data: {
    Date: string
    GapPct: number | null
    GapAbs: number | null
  }[]
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSignedPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function formatAxisDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-VE", {
    month: "short",
    day: "2-digit",
  })
}

function formatTooltipDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function getDeltaColorClass(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || value === 0) return "text-slate-900"
  return value > 0 ? "text-red-600" : "text-emerald-600"
}

export function FxGapChart({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        PositiveGapPct: point.GapPct != null && point.GapPct > 0 ? point.GapPct : null,
        NegativeGapPct: point.GapPct != null && point.GapPct < 0 ? point.GapPct : null,
      })),
    [data]
  )

  const yDomain = useMemo(() => {
    const values = chartData
      .map((point) => point.GapPct)
      .filter((value): value is number => value != null && !Number.isNaN(value))

    if (!values.length) return [-1, 1] as const

    const min = Math.min(0, ...values)
    const max = Math.max(0, ...values)
    const spread = max - min
    const padding = spread === 0 ? 1 : spread * 0.08

    return [
      Number((min - padding).toFixed(1)),
      Number((max + padding).toFixed(1)),
    ] as const
  }, [chartData])

  function TooltipGap({ active, payload, label }: TooltipContentProps) {
    const point = payload?.[0]?.payload as Props["data"][number] | undefined

    if (!active || !point) return null

    return (
      <div className="min-w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          {formatTooltipDate(typeof label === "string" ? label : point.Date)}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Brecha abs.</span>
            <span className={`font-medium ${getDeltaColorClass(point.GapAbs)}`}>
              {formatCurrency(point.GapAbs)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Brecha %</span>
            <span className={`font-medium ${getDeltaColorClass(point.GapPct)}`}>
              {formatSignedPercent(point.GapPct)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gap-positive-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="gap-negative-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.06} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.24} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="Date"
            minTickGap={28}
            tickFormatter={formatAxisDate}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={72}
            domain={yDomain}
            tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
          <Tooltip content={TooltipGap} />
          <Area
            type="monotone"
            dataKey="PositiveGapPct"
            stroke="#dc2626"
            fill="url(#gap-positive-fill)"
            strokeWidth={2}
            baseValue={0}
            connectNulls={false}
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="NegativeGapPct"
            stroke="#16a34a"
            fill="url(#gap-negative-fill)"
            strokeWidth={2}
            baseValue={0}
            connectNulls={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
