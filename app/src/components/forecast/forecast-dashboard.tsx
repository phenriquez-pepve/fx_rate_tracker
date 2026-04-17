"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  BadgeDollarSign,
  ChartNoAxesCombined,
  Download,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts"

import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildForecastModel,
  type ForecastModel,
  type ForecastProjectionRow,
  type ForecastScenarioName,
} from "@/lib/analytics/forecast"
import { FxAppRow } from "@/lib/data/types"

type Props = {
  rows: FxAppRow[]
}

type ScenarioView = ForecastScenarioName | "all"

type ForecastCombinedPoint = {
  Date: string
  ActualOfficial: number | null
  ActualParallel: number | null
  ActualGapAbs: number | null
  ActualGapPct: number | null
  RegularOfficial: number | null
  RegularParallel: number | null
  RegularGapAbs: number | null
  RegularGapPct: number | null
  OptimisticOfficial: number | null
  OptimisticParallel: number | null
  OptimisticGapAbs: number | null
  OptimisticGapPct: number | null
  PessimisticOfficial: number | null
  PessimisticParallel: number | null
  PessimisticGapAbs: number | null
  PessimisticGapPct: number | null
}

type ScenarioLookupRow = {
  date: string
  projections: Partial<Record<ForecastScenarioName, ForecastProjectionRow>>
}

const SCENARIO_STD_TEXT = "0.75"

const scenarioMeta: Record<
  ForecastScenarioName,
  {
    label: string
    stroke: string
    cardClass: string
    activeButtonClass: string
  }
> = {
  regular: {
    label: "Regular",
    stroke: "#475569",
    cardClass: "border-slate-200 bg-slate-50/70",
    activeButtonClass:
      "border-slate-700 bg-slate-700 text-white hover:bg-slate-600 hover:text-white",
  },
  optimistic: {
    label: "Optimista",
    stroke: "#16a34a",
    cardClass: "border-emerald-200 bg-emerald-50/70",
    activeButtonClass:
      "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 hover:text-white",
  },
  pessimistic: {
    label: "Pesimista",
    stroke: "#dc2626",
    cardClass: "border-red-200 bg-red-50/70",
    activeButtonClass:
      "border-red-600 bg-red-600 text-white hover:bg-red-500 hover:text-white",
  },
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${(value * 100).toFixed(digits)}%`
}

function formatSignedPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`
}

function formatGapPercentDisplay(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`
}

function formatPp(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}pp`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function formatAxisDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-VE", {
    month: "short",
    day: "2-digit",
  })
}

function shiftUtcDate(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function getDeltaColorClass(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || value === 0) return "text-slate-900"
  return value > 0 ? "text-red-600" : "text-emerald-600"
}

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value)
  if (!/[",\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

function getVisibleScenarioNames(view: ScenarioView) {
  return view === "all"
    ? (["regular", "optimistic", "pessimistic"] as const)
    : ([view] as const)
}

function setScenarioProjection(
  point: ForecastCombinedPoint,
  scenario: ForecastScenarioName,
  values: {
    OfficialRate: number | null
    ParallelRate: number | null
    GapAbs: number | null
    GapPct: number | null
  }
) {
  if (scenario === "regular") {
    point.RegularOfficial = values.OfficialRate
    point.RegularParallel = values.ParallelRate
    point.RegularGapAbs = values.GapAbs
    point.RegularGapPct = values.GapPct != null ? values.GapPct * 100 : null
    return
  }

  if (scenario === "optimistic") {
    point.OptimisticOfficial = values.OfficialRate
    point.OptimisticParallel = values.ParallelRate
    point.OptimisticGapAbs = values.GapAbs
    point.OptimisticGapPct = values.GapPct != null ? values.GapPct * 100 : null
    return
  }

  point.PessimisticOfficial = values.OfficialRate
  point.PessimisticParallel = values.ParallelRate
  point.PessimisticGapAbs = values.GapAbs
  point.PessimisticGapPct = values.GapPct != null ? values.GapPct * 100 : null
}

function getScenarioRates(
  point: ForecastCombinedPoint,
  scenario: ForecastScenarioName
) {
  if (scenario === "regular") {
    return {
      official: point.RegularOfficial,
      parallel: point.RegularParallel,
      gapAbs: point.RegularGapAbs,
      gapPct: point.RegularGapPct,
    }
  }

  if (scenario === "optimistic") {
    return {
      official: point.OptimisticOfficial,
      parallel: point.OptimisticParallel,
      gapAbs: point.OptimisticGapAbs,
      gapPct: point.OptimisticGapPct,
    }
  }

  return {
    official: point.PessimisticOfficial,
    parallel: point.PessimisticParallel,
    gapAbs: point.PessimisticGapAbs,
    gapPct: point.PessimisticGapPct,
  }
}

function buildCombinedForecastData(rows: FxAppRow[], model: ForecastModel) {
  if (!model.latestDate) return [] as ForecastCombinedPoint[]

  const lookbackStart = shiftUtcDate(model.latestDate, -59)
  const history = rows.filter((row) => row.Date >= lookbackStart)
  const points = new Map<string, ForecastCombinedPoint>()

  const createEmptyPoint = (date: string): ForecastCombinedPoint => ({
    Date: date,
    ActualOfficial: null,
    ActualParallel: null,
    ActualGapAbs: null,
    ActualGapPct: null,
    RegularOfficial: null,
    RegularParallel: null,
    RegularGapAbs: null,
    RegularGapPct: null,
    OptimisticOfficial: null,
    OptimisticParallel: null,
    OptimisticGapAbs: null,
    OptimisticGapPct: null,
    PessimisticOfficial: null,
    PessimisticParallel: null,
    PessimisticGapAbs: null,
    PessimisticGapPct: null,
  })

  history.forEach((row) => {
    points.set(row.Date, {
      ...createEmptyPoint(row.Date),
      ActualOfficial: row.OfficialRate,
      ActualParallel: row.ParallelRate,
      ActualGapAbs: row.GapAbs,
      ActualGapPct: row.GapPct != null ? row.GapPct * 100 : null,
    })
  })

  const anchor = points.get(model.latestDate) ?? createEmptyPoint(model.latestDate)
  anchor.ActualOfficial = model.latestOfficialRate
  anchor.ActualParallel = model.latestParallelRate
  anchor.ActualGapAbs = model.latestGapAbs
  anchor.ActualGapPct = model.latestGapPct != null ? model.latestGapPct * 100 : null

  model.scenarios.forEach((scenario) => {
    setScenarioProjection(anchor, scenario.name, {
      OfficialRate: model.latestOfficialRate,
      ParallelRate: model.latestParallelRate,
      GapAbs: model.latestGapAbs,
      GapPct: model.latestGapPct,
    })
  })

  points.set(model.latestDate, anchor)

  model.scenarios.forEach((scenario) => {
    scenario.projection.forEach((row) => {
      const point = points.get(row.Date) ?? createEmptyPoint(row.Date)
      setScenarioProjection(point, scenario.name, row)
      points.set(row.Date, point)
    })
  })

  return [...points.values()].sort((a, b) => a.Date.localeCompare(b.Date))
}

function buildScenarioLookup(model: ForecastModel): ScenarioLookupRow[] {
  const lookup = new Map<string, Partial<Record<ForecastScenarioName, ForecastProjectionRow>>>()

  model.scenarios.forEach((scenario) => {
    scenario.projection.forEach((row) => {
      const current = lookup.get(row.Date) ?? {}
      current[scenario.name] = row
      lookup.set(row.Date, current)
    })
  })

  return [...lookup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, projections]) => ({ date, projections }))
}

function RatesTooltip({
  active,
  payload,
  label,
  view,
}: TooltipContentProps & { view: ScenarioView }) {
  const point = payload?.[0]?.payload as ForecastCombinedPoint | undefined
  if (!active || !point) return null

  const visibleScenarios = getVisibleScenarioNames(view)
  const hasHistorical = point.ActualOfficial != null || point.ActualParallel != null

  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="mb-3 text-sm font-semibold text-slate-900">
        {formatDate(typeof label === "string" ? label : point.Date)}
      </p>

      <div className="space-y-3 text-sm">
        {hasHistorical ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Histórico</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Oficial</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(point.ActualOfficial)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Paralela</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(point.ActualParallel)}
              </span>
            </div>
          </div>
        ) : null}

        {visibleScenarios.map((scenario) => {
          const values = getScenarioRates(point, scenario)
          if (values.official == null && values.parallel == null) return null

          return (
            <div key={scenario} className="space-y-2">
              <div className="h-px bg-slate-100" />
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Proyección · {scenarioMeta[scenario].label}
              </p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Oficial</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(values.official)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Paralela</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(values.parallel)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GapTooltip({
  active,
  payload,
  label,
  view,
}: TooltipContentProps & { view: ScenarioView }) {
  const point = payload?.[0]?.payload as ForecastCombinedPoint | undefined
  if (!active || !point) return null

  const visibleScenarios = getVisibleScenarioNames(view)
  const hasHistorical = point.ActualGapPct != null || point.ActualGapAbs != null

  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="mb-3 text-sm font-semibold text-slate-900">
        {formatDate(typeof label === "string" ? label : point.Date)}
      </p>

      <div className="space-y-3 text-sm">
        {hasHistorical ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Histórico</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Brecha abs.</span>
              <span className={`font-medium ${getDeltaColorClass(point.ActualGapAbs)}`}>
                {formatCurrency(point.ActualGapAbs)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Brecha %</span>
              <span className={`font-medium ${getDeltaColorClass(point.ActualGapPct)}`}>
                {formatGapPercentDisplay(point.ActualGapPct)}
              </span>
            </div>
          </div>
        ) : null}

        {visibleScenarios.map((scenario) => {
          const values = getScenarioRates(point, scenario)
          if (values.gapPct == null && values.gapAbs == null) return null

          return (
            <div key={scenario} className="space-y-2">
              <div className="h-px bg-slate-100" />
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Proyección · {scenarioMeta[scenario].label}
              </p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Brecha abs.</span>
                <span className={`font-medium ${getDeltaColorClass(values.gapAbs)}`}>
                  {formatCurrency(values.gapAbs)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Brecha %</span>
                <span className={`font-medium ${getDeltaColorClass(values.gapPct)}`}>
                  {formatGapPercentDisplay(values.gapPct)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ForecastDashboard({ rows }: Props) {
  const [scenarioView, setScenarioView] = useState<ScenarioView>("regular")

  const model = useMemo(() => buildForecastModel(rows, 30), [rows])
  const forecastRows = useMemo(() => buildScenarioLookup(model), [model])
  const combinedData = useMemo(() => buildCombinedForecastData(rows, model), [model, rows])
  const visibleScenarios = getVisibleScenarioNames(scenarioView)

  const selectedGapAreaData = useMemo(() => {
    if (scenarioView === "all") return combinedData

    return combinedData.map((point) => {
      const values = getScenarioRates(point, scenarioView)
      return {
        ...point,
        SelectedPositiveGapPct:
          values.gapPct != null && values.gapPct > 0 ? values.gapPct : null,
        SelectedNegativeGapPct:
          values.gapPct != null && values.gapPct < 0 ? values.gapPct : null,
      }
    })
  }, [combinedData, scenarioView])

  const rateDomain = useMemo(() => {
    const values = combinedData.flatMap((point) => {
      const result: number[] = []

      if (point.ActualOfficial != null) result.push(point.ActualOfficial)
      if (point.ActualParallel != null) result.push(point.ActualParallel)

      visibleScenarios.forEach((scenario) => {
        const rates = getScenarioRates(point, scenario)
        if (rates.official != null) result.push(rates.official)
        if (rates.parallel != null) result.push(rates.parallel)
      })

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
  }, [combinedData, visibleScenarios])

  const gapDomain = useMemo(() => {
    const values = combinedData.flatMap((point) => {
      const result: number[] = []

      if (point.ActualGapPct != null) result.push(point.ActualGapPct)

      visibleScenarios.forEach((scenario) => {
        const rates = getScenarioRates(point, scenario)
        if (rates.gapPct != null) result.push(rates.gapPct)
      })

      return result
    })

    if (!values.length) return [-1, 1] as const

    const min = Math.min(0, ...values)
    const max = Math.max(0, ...values)
    const spread = max - min
    const padding = spread === 0 ? 1 : spread * 0.08

    return [
      Number((min - padding).toFixed(1)),
      Number((max + padding).toFixed(1)),
    ] as const
  }, [combinedData, visibleScenarios])

  function handleExportCsv() {
    const headers = [
      "Fecha",
      "Oficial regular",
      "Paralela regular",
      "Brecha abs. regular",
      "Brecha % regular",
      "Oficial optimista",
      "Paralela optimista",
      "Brecha abs. optimista",
      "Brecha % optimista",
      "Oficial pesimista",
      "Paralela pesimista",
      "Brecha abs. pesimista",
      "Brecha % pesimista",
    ]

    const lines = forecastRows.map(({ date, projections }) =>
      [
        date,
        projections.regular?.OfficialRate,
        projections.regular?.ParallelRate,
        projections.regular?.GapAbs,
        projections.regular?.GapPct,
        projections.optimistic?.OfficialRate,
        projections.optimistic?.ParallelRate,
        projections.optimistic?.GapAbs,
        projections.optimistic?.GapPct,
        projections.pessimistic?.OfficialRate,
        projections.pessimistic?.ParallelRate,
        projections.pessimistic?.GapAbs,
        projections.pessimistic?.GapPct,
      ]
        .map((value) => escapeCsv(value))
        .join(",")
    )

    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `fx-forecast-30d-${model.latestDate ?? "sin-fecha"}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Planeación
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Forecast de devaluación
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Proyección descriptiva a 30 días para tasa oficial, tasa paralela y brecha, con escenarios basados en promedio histórico y volatilidad reciente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Última tasa oficial"
          value={formatCurrency(model.latestOfficialRate)}
          subtitle={model.latestDate ? `Cierre ${formatDate(model.latestDate)}` : "Sin datos"}
          icon={<BadgeDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Última tasa paralela"
          value={formatCurrency(model.latestParallelRate)}
          subtitle={model.latestDate ? `Cierre ${formatDate(model.latestDate)}` : "Sin datos"}
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          title="Base diaria oficial"
          value={formatPercent(model.regularOfficialBase, 3)}
          subtitle="Promedio ponderado 7/14/30/52/90 días"
          delta={formatSignedPercent(model.regularOfficialBase, 3)}
          deltaPositiveIsBad
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Base diaria paralela"
          value={formatPercent(model.regularParallelBase, 3)}
          subtitle="Promedio ponderado 7/14/30/52/90 días"
          delta={formatSignedPercent(model.regularParallelBase, 3)}
          deltaPositiveIsBad
          icon={<ChartNoAxesCombined className="h-5 w-5" />}
        />
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Metodología del forecast</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-slate-600 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-medium text-slate-900">Variables utilizadas</p>
            <p className="mt-2">
              Se toma como ancla el último valor disponible de tasa oficial y paralela, y se calculan devaluaciones diarias históricas sobre ventanas de 7, 14, 30, 52 y 90 días.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-medium text-slate-900">Escenario regular</p>
            <p className="mt-2">
              Usa un promedio ponderado de devaluación diaria, dando más peso a la historia reciente para capturar la tendencia actual sin ignorar el contexto de mediano plazo.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-medium text-slate-900">Optimista y pesimista</p>
            <p className="mt-2">
              Ajustan la base regular en {SCENARIO_STD_TEXT} desviaciones estándar. La brecha se proyecta directamente a partir de las tasas estimadas, no como un supuesto independiente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Devaluación diaria promedio histórica</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Oficial</th>
                  <th className="px-4 py-3 font-medium">Paralela</th>
                  <th className="px-4 py-3 font-medium">Vol. oficial</th>
                  <th className="px-4 py-3 font-medium">Vol. paralela</th>
                  <th className="px-4 py-3 font-medium">Cambio brecha (pp/día)</th>
                </tr>
              </thead>
              <tbody>
                {model.windows.map((window) => (
                  <tr key={window.days} className="border-t border-slate-200 bg-white">
                    <td className="px-4 py-3">{window.label}</td>
                    <td className={`px-4 py-3 font-medium ${getDeltaColorClass(window.officialAvgDailyDevaluation)}`}>
                      {formatSignedPercent(window.officialAvgDailyDevaluation, 3)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${getDeltaColorClass(window.parallelAvgDailyDevaluation)}`}>
                      {formatSignedPercent(window.parallelAvgDailyDevaluation, 3)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatPercent(window.officialStdDev, 3)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatPercent(window.parallelStdDev, 3)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${getDeltaColorClass(window.gapAvgDailyChangePp)}`}>
                      {formatPp(window.gapAvgDailyChangePp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {model.scenarios.map((scenario) => {
          const lastProjection = scenario.projection.at(-1)

          return (
            <Card
              key={scenario.name}
              className={`rounded-2xl border shadow-sm ${scenarioMeta[scenario.name].cardClass}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{scenario.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>{scenario.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Oficial diario
                    </p>
                    <p className={`mt-1 font-semibold ${getDeltaColorClass(scenario.officialDailyDevaluation)}`}>
                      {formatSignedPercent(scenario.officialDailyDevaluation, 3)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Paralela diaria
                    </p>
                    <p className={`mt-1 font-semibold ${getDeltaColorClass(scenario.parallelDailyDevaluation)}`}>
                      {formatSignedPercent(scenario.parallelDailyDevaluation, 3)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    Cierre proyectado a {model.horizonDays} días
                  </p>
                  <div className="mt-2 space-y-1">
                    <p>
                      Oficial:{" "}
                      <span className="font-medium text-slate-900">
                        {formatCurrency(lastProjection?.OfficialRate)}
                      </span>
                    </p>
                    <p>
                      Paralela:{" "}
                      <span className="font-medium text-slate-900">
                        {formatCurrency(lastProjection?.ParallelRate)}
                      </span>
                    </p>
                    <p>
                      Brecha:{" "}
                      <span className={`font-medium ${getDeltaColorClass(lastProjection?.GapPct)}`}>
                        {formatSignedPercent(lastProjection?.GapPct)}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Escenarios visibles en gráficos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="rounded-2xl bg-slate-100 p-1">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={
                  scenarioView === "all"
                    ? "border-slate-700 bg-slate-700 text-white hover:bg-slate-600 hover:text-white"
                    : "border-white bg-white text-slate-600 hover:bg-white"
                }
                onClick={() => setScenarioView("all")}
              >
                All
              </Button>
              {(Object.keys(scenarioMeta) as ForecastScenarioName[]).map((scenario) => (
                <Button
                  key={scenario}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={
                    scenarioView === scenario
                      ? scenarioMeta[scenario].activeButtonClass
                      : "border-white bg-white text-slate-600 hover:bg-white"
                  }
                  onClick={() => setScenarioView(scenario)}
                >
                  {scenarioMeta[scenario].label}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Línea continua = oficial · Línea punteada = paralela
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Tasas proyectadas · {scenarioView === "all" ? "All" : scenarioMeta[scenarioView].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="Date"
                    minTickGap={28}
                    tickFormatter={formatAxisDate}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={82}
                    domain={rateDomain}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine
                    x={model.latestDate ?? undefined}
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                  />
                  <Tooltip content={(props) => <RatesTooltip {...props} view={scenarioView} />} />
                  <Line
                    type="monotone"
                    dataKey="ActualOfficial"
                    stroke="#000000"
                    strokeWidth={2}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ActualParallel"
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeOpacity={0.7}
                    strokeDasharray="3 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                  />
                  {visibleScenarios.map((scenario) => (
                    <Line
                      key={`${scenario}-official`}
                      type="monotone"
                      dataKey={
                        scenario === "regular"
                          ? "RegularOfficial"
                          : scenario === "optimistic"
                            ? "OptimisticOfficial"
                            : "PessimisticOfficial"
                      }
                      stroke={scenarioMeta[scenario].stroke}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                    />
                  ))}
                  {visibleScenarios.map((scenario) => (
                    <Line
                      key={`${scenario}-parallel`}
                      type="monotone"
                      dataKey={
                        scenario === "regular"
                          ? "RegularParallel"
                          : scenario === "optimistic"
                            ? "OptimisticParallel"
                            : "PessimisticParallel"
                      }
                      stroke={scenarioMeta[scenario].stroke}
                      strokeWidth={2}
                      strokeDasharray="3 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Brecha proyectada · {scenarioView === "all" ? "All" : scenarioMeta[scenarioView].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {scenarioView === "all" ? (
                  <LineChart data={combinedData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="Date"
                      minTickGap={28}
                      tickFormatter={formatAxisDate}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      width={72}
                      domain={gapDomain}
                      tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                    <ReferenceLine
                      x={model.latestDate ?? undefined}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                    />
                    <Tooltip content={(props) => <GapTooltip {...props} view={scenarioView} />} />
                    <Line
                      type="monotone"
                      dataKey="ActualGapPct"
                      stroke="#0f172a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                    />
                    {visibleScenarios.map((scenario) => (
                      <Line
                        key={`${scenario}-gap`}
                        type="monotone"
                        dataKey={
                          scenario === "regular"
                            ? "RegularGapPct"
                            : scenario === "optimistic"
                              ? "OptimisticGapPct"
                              : "PessimisticGapPct"
                        }
                        stroke={scenarioMeta[scenario].stroke}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={false}
                        activeDot={false}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={selectedGapAreaData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecast-gap-positive-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.06} />
                      </linearGradient>
                      <linearGradient id="forecast-gap-negative-fill" x1="0" y1="0" x2="0" y2="1">
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
                      domain={gapDomain}
                      tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                    <ReferenceLine
                      x={model.latestDate ?? undefined}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                    />
                    <Tooltip content={(props) => <GapTooltip {...props} view={scenarioView} />} />
                    <Line
                      type="monotone"
                      dataKey="ActualGapPct"
                      stroke="#0f172a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="SelectedPositiveGapPct"
                      stroke="#dc2626"
                      fill="url(#forecast-gap-positive-fill)"
                      strokeWidth={2}
                      baseValue={0}
                      connectNulls={false}
                      dot={false}
                      activeDot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="SelectedNegativeGapPct"
                      stroke="#16a34a"
                      fill="url(#forecast-gap-negative-fill)"
                      strokeWidth={2}
                      baseValue={0}
                      connectNulls={false}
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tabla exportable de proyección a 30 días</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Incluye oficial, paralela, brecha absoluta y brecha porcentual para los tres escenarios.
            </p>
            <Button type="button" variant="outline" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Oficial regular</th>
                  <th className="px-4 py-3 font-medium">Paralela regular</th>
                  <th className="px-4 py-3 font-medium">Brecha abs. regular</th>
                  <th className="px-4 py-3 font-medium">Brecha % regular</th>
                  <th className="px-4 py-3 font-medium">Oficial optimista</th>
                  <th className="px-4 py-3 font-medium">Paralela optimista</th>
                  <th className="px-4 py-3 font-medium">Brecha abs. optimista</th>
                  <th className="px-4 py-3 font-medium">Brecha % optimista</th>
                  <th className="px-4 py-3 font-medium">Oficial pesimista</th>
                  <th className="px-4 py-3 font-medium">Paralela pesimista</th>
                  <th className="px-4 py-3 font-medium">Brecha abs. pesimista</th>
                  <th className="px-4 py-3 font-medium">Brecha % pesimista</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map(({ date, projections }) => (
                  <tr key={date} className="border-t border-slate-200 bg-white">
                    <td className="px-4 py-3">{date}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.regular?.OfficialRate)}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.regular?.ParallelRate)}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.regular?.GapAbs)}</td>
                    <td className={`px-4 py-3 font-medium ${getDeltaColorClass(projections.regular?.GapPct)}`}>
                      {formatSignedPercent(projections.regular?.GapPct)}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(projections.optimistic?.OfficialRate)}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.optimistic?.ParallelRate)}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.optimistic?.GapAbs)}</td>
                    <td className={`px-4 py-3 font-medium ${getDeltaColorClass(projections.optimistic?.GapPct)}`}>
                      {formatSignedPercent(projections.optimistic?.GapPct)}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(projections.pessimistic?.OfficialRate)}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.pessimistic?.ParallelRate)}</td>
                    <td className="px-4 py-3">{formatCurrency(projections.pessimistic?.GapAbs)}</td>
                    <td className={`px-4 py-3 font-medium ${getDeltaColorClass(projections.pessimistic?.GapPct)}`}>
                      {formatSignedPercent(projections.pessimistic?.GapPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
