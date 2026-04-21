"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FxAppRow } from "@/lib/data/types"
import { KpiCard } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BadgeDollarSign, Activity, CalendarRange, TrendingUp, GitCompareArrows } from "lucide-react"
import {
  firstAvailableInMonth,
  firstAvailableInYear,
  getLatestDate,
  getLatestRow,
} from "@/lib/analytics/kpis"
import { useMounted } from "@/hooks/use-mounted"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  type TooltipContentProps,
} from "recharts"

type Props = {
  rows: FxAppRow[]
}

type RateMode = "official" | "parallel"

type MonthlyPoint = {
  Date: string
  MonthLabel: string
  OfficialRate: number | null
  ParallelRate: number | null
  OfficialStartDate: string | null
  OfficialEndDate: string | null
  ParallelStartDate: string | null
  ParallelEndDate: string | null
  OfficialMonthDev: number | null
  ParallelMonthDev: number | null
  GapPct: number | null
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${(value * 100).toFixed(1)}%`
}

function formatPp(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value.toFixed(1)}pp`
}

function formatSignedPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`
}

function formatSignedPp(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}pp`
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function latestAvailableOnOrBefore(
  rows: FxAppRow[],
  key: "OfficialRate" | "ParallelRate" | "GapPct",
  targetDate: string
) {
  const candidates = rows
    .filter((r) => r.Date <= targetDate && r[key] != null)
    .sort((a, b) => a.Date.localeCompare(b.Date))

  return candidates.at(-1) ?? null
}

function sameDateLastYear(dateStr: string) {
  const d = new Date(dateStr)
  d.setUTCFullYear(d.getUTCFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function daysAgo(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function buildMonthlySeries(rows: FxAppRow[]): MonthlyPoint[] {
  if (!rows.length) return []

  const sorted = [...rows].sort((a, b) => a.Date.localeCompare(b.Date))
  const latestDate = getLatestDate(sorted)
  if (!latestDate) return []

  const latest = new Date(latestDate)
  const start = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - 11, 1))

  const filtered = sorted.filter((r) => new Date(r.Date) >= start)

  const byMonth = new Map<string, FxAppRow[]>()
  for (const row of filtered) {
    const d = new Date(row.Date)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(row)
  }

  const result: MonthlyPoint[] = []

  for (const [, monthRows] of [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ordered = [...monthRows].sort((a, b) => a.Date.localeCompare(b.Date))
    const last = ordered.at(-1)!
    const firstOfficial = ordered.find((r) => r.OfficialRate != null) ?? null
    const lastOfficial = [...ordered].reverse().find((r) => r.OfficialRate != null) ?? null
    const firstParallel = ordered.find((r) => r.ParallelRate != null) ?? null
    const lastParallel = [...ordered].reverse().find((r) => r.ParallelRate != null) ?? null

    const officialMonthDev =
      lastOfficial?.OfficialRate != null && firstOfficial?.OfficialRate != null
        ? (lastOfficial.OfficialRate - firstOfficial.OfficialRate) / firstOfficial.OfficialRate
        : null

    const parallelMonthDev =
      lastParallel?.ParallelRate != null && firstParallel?.ParallelRate != null
        ? (lastParallel.ParallelRate - firstParallel.ParallelRate) / firstParallel.ParallelRate
        : null

    result.push({
      Date: last.Date,
      MonthLabel: new Date(last.Date).toLocaleDateString("es-VE", {
        month: "short",
        year: "2-digit",
      }),
      OfficialRate: lastOfficial?.OfficialRate ?? null,
      ParallelRate: lastParallel?.ParallelRate ?? null,
      OfficialStartDate: firstOfficial?.Date ?? null,
      OfficialEndDate: lastOfficial?.Date ?? null,
      ParallelStartDate: firstParallel?.Date ?? null,
      ParallelEndDate: lastParallel?.Date ?? null,
      OfficialMonthDev: officialMonthDev,
      ParallelMonthDev: parallelMonthDev,
      GapPct: last.GapPct,
    })
  }

  return result
}

function TooltipResumen({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload as MonthlyPoint | undefined
  if (!point) return null

  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="mb-3 text-sm font-semibold text-slate-900">
        {label ?? point.MonthLabel}
      </p>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Oficial</span>
          <span className="font-medium text-slate-900">{formatCurrency(point.OfficialRate)}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Comparación oficial</span>
          <span className="text-right font-medium text-slate-900">
            {point.OfficialStartDate && point.OfficialEndDate
              ? `${formatDate(point.OfficialStartDate)} vs ${formatDate(point.OfficialEndDate)}`
              : "N/A"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Devaluación mensual oficial</span>
          <span className={`font-medium ${point.OfficialMonthDev != null && point.OfficialMonthDev >= 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatSignedPercent(point.OfficialMonthDev)}
          </span>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Paralela</span>
          <span className="font-medium text-slate-900">{formatCurrency(point.ParallelRate)}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Comparación paralela</span>
          <span className="text-right font-medium text-slate-900">
            {point.ParallelStartDate && point.ParallelEndDate
              ? `${formatDate(point.ParallelStartDate)} vs ${formatDate(point.ParallelEndDate)}`
              : "N/A"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Devaluación mensual paralela</span>
          <span className={`font-medium ${point.ParallelMonthDev != null && point.ParallelMonthDev >= 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatSignedPercent(point.ParallelMonthDev)}
          </span>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Brecha</span>
          <span className={`font-medium ${point.GapPct != null && point.GapPct >= 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatSignedPercent(point.GapPct)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SummaryDashboard({ rows }: Props) {
  const mounted = useMounted()
  const [mode, setMode] = useState<RateMode>("official")

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.Date.localeCompare(b.Date)),
    [rows]
  )

  const latestRow = useMemo(() => getLatestRow(sortedRows), [sortedRows])
  const latestDate = latestRow?.Date ?? null

  const monthlySeries = useMemo(() => buildMonthlySeries(sortedRows), [sortedRows])

  const selectedKpis = useMemo(() => {
    if (!latestRow || !latestDate) {
      return {
        latestRate: null,
        mtd: null,
        ytd: null,
        interannual: null,
      }
    }

    const rateKey = mode === "official" ? "OfficialRate" : "ParallelRate"

    const monthStartRow = firstAvailableInMonth(sortedRows, rateKey, latestDate)
    const yearStartRow = firstAvailableInYear(sortedRows, rateKey, latestDate)
    const pyRow = latestAvailableOnOrBefore(sortedRows, rateKey, sameDateLastYear(latestDate))

    const latestRate = latestRow[rateKey]

    const mtd =
      latestRate != null && monthStartRow?.[rateKey] != null
        ? (latestRate - monthStartRow[rateKey]!) / monthStartRow[rateKey]!
        : null

    const ytd =
      latestRate != null && yearStartRow?.[rateKey] != null
        ? (latestRate - yearStartRow[rateKey]!) / yearStartRow[rateKey]!
        : null

    const interannual =
      latestRate != null && pyRow?.[rateKey] != null
        ? (latestRate - pyRow[rateKey]!) / pyRow[rateKey]!
        : null

    return {
      latestRate,
      mtd,
      ytd,
      interannual,
    }
  }, [latestRow, latestDate, mode, sortedRows])

  const gapKpis = useMemo(() => {
    if (!latestDate) {
      return {
        currentGap: null,
        change14dPp: null,
        change30dPp: null,
        changeYtdPp: null,
      }
    }

    const currentGap = latestRow?.GapPct ?? null
    const gap14d = latestAvailableOnOrBefore(sortedRows, "GapPct", daysAgo(latestDate, 14))
    const gap30d = latestAvailableOnOrBefore(sortedRows, "GapPct", daysAgo(latestDate, 30))
    const yearStartDate = new Date(Date.UTC(new Date(latestDate).getUTCFullYear(), 0, 1))
      .toISOString()
      .slice(0, 10)
    const gapYearStart = latestAvailableOnOrBefore(sortedRows, "GapPct", yearStartDate)

    return {
      currentGap,
      change14dPp:
        currentGap != null && gap14d?.GapPct != null
          ? (currentGap - gap14d.GapPct) * 100
          : null,
      change30dPp:
        currentGap != null && gap30d?.GapPct != null
          ? (currentGap - gap30d.GapPct) * 100
          : null,
      changeYtdPp:
        currentGap != null && gapYearStart?.GapPct != null
          ? (currentGap - gapYearStart.GapPct) * 100
          : null,
    }
  }, [latestDate, latestRow, sortedRows])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Panel principal</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Resumen ejecutivo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitoreo de tasa oficial, paralela y brecha con actualización automática.
          </p>
        </div>

        <div className="w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
          <div className="relative grid grid-cols-2">
            <motion.div
              animate={{ x: mode === "official" ? 0 : "calc(100% + 4px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-sm"
              style={{ width: "calc(50% - 4px)" }}
            />
            <button
              onClick={() => setMode("official")}
              className={`relative z-10 flex min-w-0 items-center justify-center rounded-xl px-4 py-2 text-center text-sm font-medium transition sm:min-w-28 ${
                mode === "official" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              Oficial
            </button>
            <button
              onClick={() => setMode("parallel")}
              className={`relative z-10 flex min-w-0 items-center justify-center rounded-xl px-4 py-2 text-center text-sm font-medium transition sm:min-w-28 ${
                mode === "parallel" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              Paralela
            </button>
          </div>
        </div>
      </div>

      {/* Fila 1 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            title={`Tasa ${mode === "official" ? "oficial" : "paralela"} de hoy`}
            value={formatCurrency(selectedKpis.latestRate)}
            subtitle="Último valor disponible"
            icon={mode === "official" ? <BadgeDollarSign className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
          />
          <KpiCard
            title="Devaluación MTD"
            value={formatPercent(selectedKpis.mtd)}
            delta={formatSignedPercent(selectedKpis.mtd)}
            deltaPositiveIsBad
            subtitle="Mes actual"
            icon={<CalendarRange className="h-5 w-5" />}
          />
          <KpiCard
            title="Devaluación YTD"
            value={formatPercent(selectedKpis.ytd)}
            delta={formatSignedPercent(selectedKpis.ytd)}
            deltaPositiveIsBad
            subtitle="Año actual"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            title="Devaluación interanual"
            value={formatPercent(selectedKpis.interannual)}
            delta={formatSignedPercent(selectedKpis.interannual)}
            deltaPositiveIsBad
            subtitle="Vs. mismo período año anterior"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </motion.div>
      </AnimatePresence>

      {/* Fila 2 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <Card className="xl:col-span-3 rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolución últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[390px] w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={monthlySeries} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <XAxis dataKey="MonthLabel" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip content={TooltipResumen} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="OfficialRate"
                      name="Tasa oficial"
                      stroke="#000000"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={{ r: 2.5, fill: "#000000", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ParallelRate"
                      name="Tasa paralela"
                      stroke="#2563eb"
                      strokeWidth={2}
                      strokeDasharray="3 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={{ r: 2.5, fill: "#2563eb", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 self-start">
  <KpiCard
    title="Brecha actual"
    value={formatPercent(gapKpis.currentGap)}
    delta={formatSignedPercent(gapKpis.currentGap)}
    deltaPositiveIsBad
    subtitle="Paralela vs. oficial"
    icon={<GitCompareArrows className="h-5 w-5" />}
    compact
  />
  <KpiCard
    title="Brecha Δ 14 días"
    value={formatPp(gapKpis.change14dPp)}
    delta={formatSignedPp(gapKpis.change14dPp)}
    deltaPositiveIsBad
    subtitle="Cambio en puntos porcentuales"
    icon={<TrendingUp className="h-5 w-5" />}
    compact
  />
  <KpiCard
    title="Brecha Δ 30 días"
    value={formatPp(gapKpis.change30dPp)}
    delta={formatSignedPp(gapKpis.change30dPp)}
    deltaPositiveIsBad
    subtitle="Cambio en puntos porcentuales"
    icon={<TrendingUp className="h-5 w-5" />}
    compact
  />
</div>
      </div>
    </div>
  )
}
