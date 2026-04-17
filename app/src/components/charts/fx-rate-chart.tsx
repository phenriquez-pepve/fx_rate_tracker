"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts"

type Props = {
  data: {
    Date: string
    OfficialRate: number | null
    ParallelRate: number | null
  }[]
  showMarkers?: boolean
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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

export function FxRateChart({ data, showMarkers = false }: Props) {
  const [showOfficial, setShowOfficial] = useState(true)
  const [showParallel, setShowParallel] = useState(true)

  const visibleData = useMemo(() => {
    if (!showOfficial && !showParallel) return []

    return data.filter((point) => {
      const hasOfficial = showOfficial && point.OfficialRate != null
      const hasParallel = showParallel && point.ParallelRate != null

      return hasOfficial || hasParallel
    })
  }, [data, showOfficial, showParallel])

  const yDomain = useMemo(() => {
    const values = visibleData.flatMap((point) => {
      const result: number[] = []

      if (showOfficial && point.OfficialRate != null) {
        result.push(point.OfficialRate)
      }

      if (showParallel && point.ParallelRate != null) {
        result.push(point.ParallelRate)
      }

      return result
    })

    if (!values.length) return [0, 1] as const

    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = max - min
    const padding = spread === 0 ? Math.max(Math.abs(max) * 0.08, 1) : spread * 0.08

    return [
      Math.max(0, Number((min - padding).toFixed(2))),
      Number((max + padding).toFixed(2)),
    ] as const
  }, [showOfficial, showParallel, visibleData])

  function TooltipRates({ active, payload, label }: TooltipContentProps) {
    const point = payload?.[0]?.payload as Props["data"][number] | undefined

    if (!active || !point) return null

    return (
      <div className="min-w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          {formatTooltipDate(typeof label === "string" ? label : point.Date)}
        </p>

        <div className="space-y-2 text-sm">
          {showOfficial ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Oficial</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(point.OfficialRate)}
              </span>
            </div>
          ) : null}

          {showParallel ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Paralela</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(point.ParallelRate)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={
            showOfficial
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }
          onClick={() => setShowOfficial((current) => !current)}
        >
          <span className="h-0.5 w-4 rounded-full bg-current" />
          Tasa oficial
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={
            showParallel
              ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-500 hover:text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }
          onClick={() => setShowParallel((current) => !current)}
        >
          <span className="h-0.5 w-4 rounded-full border-b border-dashed border-current" />
          Tasa paralela
        </Button>
      </div>

      <div className="relative h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="Date"
              minTickGap={28}
              tickFormatter={formatAxisDate}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={82}
              domain={yDomain}
              tickFormatter={(value) => formatCurrency(Number(value))}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={TooltipRates} />
            {showOfficial ? (
              <Line
                type="monotone"
                dataKey="OfficialRate"
                name="Tasa oficial"
                stroke="#000000"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={showMarkers ? { r: 2.5, fill: "#000000", strokeWidth: 0 } : false}
                activeDot={showMarkers ? { r: 4 } : false}
                connectNulls={false}
              />
            ) : null}
            {showParallel ? (
              <Line
                type="monotone"
                dataKey="ParallelRate"
                name="Tasa paralela"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="3 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={showMarkers ? { r: 2.5, fill: "#2563eb", strokeWidth: 0 } : false}
                activeDot={showMarkers ? { r: 4 } : false}
                connectNulls={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>

        {!showOfficial && !showParallel ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm text-slate-500 backdrop-blur-sm">
            Activa al menos una serie para ver la tendencia.
          </div>
        ) : null}
      </div>
    </div>
  )
}
