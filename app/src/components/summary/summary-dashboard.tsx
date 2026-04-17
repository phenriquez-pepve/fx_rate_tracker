"use client"

import { useMemo, useState } from "react"
import { FxAppRow } from "@/lib/data/types"
import { KpiCard } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import {
  Activity,
  BadgeDollarSign,
  CalendarRange,
  TrendingUp,
  GitCompareArrows,
} from "lucide-react"

type Props = {
  rows: FxAppRow[]
}

type RateMode = "official" | "parallel"

type MonthlyPoint = {
  Date: string
  MonthLabel: string
  OfficialRate: number | null
  ParallelRate: number | null
  OfficialMonthDev: number | null
  ParallelMonthDev: number | null
  GapPct: number | null
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return new Intl.NumberFormat("en-US", {
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

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function getLatestRow(rows: FxAppRow[]) {
  if (!rows.length) return null
  return [...rows].sort((a, b) => a.Date.localeCompare(b.Date)).at(-1) ?? null
}

function getLatestDate(rows: FxAppRow[]) {
  return getLatestRow(rows)?.Date ?? null
}

function firstAvailableInMonth(
  rows: FxAppRow[],
  key: "OfficialRate" | "ParallelRate",
  latestDate: string
) {
  const latest = new Date(latestDate)
  const y = latest.getUTCFullYear()
  const m = latest.getUTCMonth()

  return rows.find((r) => {
    const d = new Date(r.Date)
    return d.getUTCFullYear() === y && d.getUTCMonth() === m && r[key] != null
  }) ?? null
}

function firstAvailableInYear(
  rows: FxAppRow[],
  key: "OfficialRate" | "ParallelRate",
  latestDate: string
) {
  const latest = new Date(latestDate)
  const y = latest.getUTCFullYear()

  return rows.find((r) => {
    const d = new Date(r.Date)
    return d.getUTCFullYear() === y && r[key] != null
  }) ?? null
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

function monthStart(dateStr: string) {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
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

  for (const [key, monthRows] of [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ordered = [...monthRows].sort((a, b) => a.Date.localeCompare(b.Date))
    const last = ordered.at(-1)!
    const firstOfficial = ordered.find((r) => r.OfficialRate != null) ?? null
    const firstParallel = ordered.find((r) => r.ParallelRate != null) ?? null

    const officialMonthDev =
      last.OfficialRate != null && firstOfficial?.OfficialRate != null
        ? (last.OfficialRate - firstOfficial.OfficialRate) / firstOfficial.OfficialRate
        : null

    const parallelMonthDev =
      last.ParallelRate != null && firstParallel?.ParallelRate != null
        ? (last.ParallelRate - firstParallel.ParallelRate) / firstParallel.ParallelRate
        : null

    result.push({
      Date: last.Date,
      MonthLabel: new Date(last.Date).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      OfficialRate: last.OfficialRate,
      ParallelRate: last.ParallelRate,
      OfficialMonthDev: officialMonthDev,
      ParallelMonthDev: parallelMonthDev,
      GapPct: last.GapPct,
    })
  }

  return result
}

function SummaryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: any[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload as MonthlyPoint | undefined
  if (!point) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="mb-2 text-sm font-medium text-slate-900">{formatDate(label ?? point.Date)}</p>
      <div className="space-y-1 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-900">Official FX:</span>{" "}
          {formatCurrency(point.OfficialRate)}
        </p>
        <p>
          <span className="font-medium text-slate-900">Official monthly dev.:</span>{" "}
          {formatPercent(point.OfficialMonthDev)}
        </p>
        <p>
          <span className="font-medium text-slate-900">Parallel FX:</span>{" "}
          {formatCurrency(point.ParallelRate)}
        </p>
        <p>
          <span className="font-medium text-slate-900">Parallel monthly dev.:</span>{" "}
          {formatPercent(point.ParallelMonthDev)}
        </p>
        <p>
          <span className="font-medium text-slate-900">Gap:</span> {formatPercent(point.GapPct)}
        </p>
      </div>
    </div>
  )
}

export function SummaryDashboard({ rows }: Props) {
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
    if (!latestDate || !latestRow?.GapPct) {
      return {
        currentGap: latestRow?.GapPct ?? null,
        change14dPp: null,
        change30dPp: null,
        changeYtdPp: null,
      }
    }

    const gap14d = latestAvailableOnOrBefore(sortedRows, "GapPct", daysAgo(latestDate, 14))
    const gap30d = latestAvailableOnOrBefore(sortedRows, "GapPct", daysAgo(latestDate, 30))
    const yearStartDate = new Date(Date.UTC(new Date(latestDate).getUTCFullYear(), 0, 1))
      .toISOString()
      .slice(0, 10)
    const gapYearStart = latestAvailableOnOrBefore(sortedRows, "GapPct", yearStartDate)

    const currentGap = latestRow.GapPct ?? null

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
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Executive Summary</h2>
            <p className="text-sm text-slate-500">
              Latest anchored KPIs and 12-month FX evolution.
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as RateMode)}>
            <TabsList className="rounded-2xl bg-slate-100 p-1">
              <TabsTrigger value="official" className="rounded-xl px-4">
                Official
              </TabsTrigger>
              <TabsTrigger value="parallel" className="rounded-xl px-4">
                Parallel
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Today's ${mode === "official" ? "Official" : "Parallel"} FX`}
          value={formatCurrency(selectedKpis.latestRate)}
          subtitle="Latest available daily value"
          icon={mode === "official" ? <BadgeDollarSign className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
        />
        <KpiCard
          title="MTD Devaluation"
          value={formatPercent(selectedKpis.mtd)}
          subtitle="Latest vs first available date of current month"
          icon={<CalendarRange className="h-5 w-5" />}
        />
        <KpiCard
          title="YTD Devaluation"
          value={formatPercent(selectedKpis.ytd)}
          subtitle="Latest vs first available date of current year"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Interannual Devaluation"
          value={formatPercent(selectedKpis.interannual)}
          subtitle="Latest vs same period last year"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Row 2: chart + gap KPI stack */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <Card className="xl:col-span-3 rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Last 12 Months FX Evolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySeries} margin={{ top: 16, right: 16, left: 4, bottom: 8 }}>
                  <XAxis dataKey="MonthLabel" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<SummaryTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="OfficialRate"
                    name="Official FX"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#2563eb" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ParallelRate"
                    name="Parallel FX"
                    stroke="#f97316"
                    strokeWidth={3}
                    strokeDasharray="7 7"
                    dot={{ r: 4, fill: "#f97316" }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <KpiCard
            title="Current Gap"
            value={formatPercent(gapKpis.currentGap)}
            subtitle="Parallel vs Official"
            icon={<GitCompareArrows className="h-5 w-5" />}
          />
          <KpiCard
            title="Gap Δ 14D"
            value={formatPp(gapKpis.change14dPp)}
            subtitle="Change in percentage points"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            title="Gap Δ 30D"
            value={formatPp(gapKpis.change30dPp)}
            subtitle="Change in percentage points"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            title="Gap Δ YTD"
            value={formatPp(gapKpis.changeYtdPp)}
            subtitle="Change in percentage points"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  )
}
