import { FxAppRow } from "@/lib/data/types"

export type ForecastScenarioName = "regular" | "optimistic" | "pessimistic"

export type ForecastWindowMetric = {
  label: string
  days: number
  officialAvgDailyDevaluation: number | null
  parallelAvgDailyDevaluation: number | null
  officialStdDev: number | null
  parallelStdDev: number | null
  gapAvgDailyChangePp: number | null
}

export type ForecastProjectionRow = {
  Date: string
  Day: number
  OfficialRate: number | null
  ParallelRate: number | null
  GapAbs: number | null
  GapPct: number | null
  OfficialDailyDevaluation: number | null
  ParallelDailyDevaluation: number | null
}

export type ForecastScenario = {
  name: ForecastScenarioName
  label: string
  description: string
  officialDailyDevaluation: number | null
  parallelDailyDevaluation: number | null
  officialVolatility: number | null
  parallelVolatility: number | null
  projection: ForecastProjectionRow[]
}

export type ForecastModel = {
  latestDate: string | null
  latestOfficialRate: number | null
  latestParallelRate: number | null
  latestGapPct: number | null
  latestGapAbs: number | null
  horizonDays: number
  windows: ForecastWindowMetric[]
  regularOfficialBase: number | null
  regularParallelBase: number | null
  officialVolatility: number | null
  parallelVolatility: number | null
  scenarios: ForecastScenario[]
}

type ReturnPoint = {
  Date: string
  value: number
}

const FORECAST_WINDOWS = [
  { label: "Última semana", days: 7, weight: 0.3 },
  { label: "Últimos 14 días", days: 14, weight: 0.25 },
  { label: "Últimos 30 días", days: 30, weight: 0.2 },
  { label: "Últimos 52 días", days: 52, weight: 0.15 },
  { label: "Últimos 90 días", days: 90, weight: 0.1 },
] as const

const SCENARIO_STD_MULTIPLIER = 0.75
const MIN_DAILY_RATE = -0.99

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function shiftUtcDate(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return toIsoDate(date)
}

function mean(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (!values.length) return null
  const avg = mean(values)
  if (avg == null) return null

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length

  return Math.sqrt(variance)
}

function weightedAverage(values: Array<{ value: number | null; weight: number }>) {
  const valid = values.filter(
    (entry): entry is { value: number; weight: number } =>
      entry.value != null && !Number.isNaN(entry.value)
  )

  if (!valid.length) return null

  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0)
  if (!totalWeight) return null

  return valid.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight
}

function buildDailyReturnSeries(
  rows: FxAppRow[],
  key: "OfficialRate" | "ParallelRate"
): ReturnPoint[] {
  const result: ReturnPoint[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const current = rows[index][key]
    const previous = rows[index - 1][key]

    if (current == null || previous == null || previous === 0) continue

    result.push({
      Date: rows[index].Date,
      value: (current - previous) / previous,
    })
  }

  return result
}

function buildGapChangeSeries(rows: FxAppRow[]): ReturnPoint[] {
  const result: ReturnPoint[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const current = rows[index].GapPct
    const previous = rows[index - 1].GapPct

    if (current == null || previous == null) continue

    result.push({
      Date: rows[index].Date,
      value: (current - previous) * 100,
    })
  }

  return result
}

function getWindowValues(series: ReturnPoint[], latestDate: string, days: number) {
  const startDate = shiftUtcDate(latestDate, -(days - 1))
  return series
    .filter((point) => point.Date >= startDate && point.Date <= latestDate)
    .map((point) => point.value)
}

function buildProjection(
  latestDate: string,
  horizonDays: number,
  latestOfficialRate: number | null,
  latestParallelRate: number | null,
  officialDailyDevaluation: number | null,
  parallelDailyDevaluation: number | null
) {
  const result: ForecastProjectionRow[] = []
  let officialRate = latestOfficialRate
  let parallelRate = latestParallelRate

  for (let day = 1; day <= horizonDays; day += 1) {
    const date = shiftUtcDate(latestDate, day)

    if (officialRate != null && officialDailyDevaluation != null) {
      officialRate *= 1 + officialDailyDevaluation
    } else {
      officialRate = null
    }

    if (parallelRate != null && parallelDailyDevaluation != null) {
      parallelRate *= 1 + parallelDailyDevaluation
    } else {
      parallelRate = null
    }

    const gapAbs =
      officialRate != null && parallelRate != null ? parallelRate - officialRate : null
    const gapPct =
      officialRate != null && parallelRate != null && officialRate !== 0
        ? gapAbs! / officialRate
        : null

    result.push({
      Date: date,
      Day: day,
      OfficialRate: officialRate != null ? Number(officialRate.toFixed(4)) : null,
      ParallelRate: parallelRate != null ? Number(parallelRate.toFixed(4)) : null,
      GapAbs: gapAbs != null ? Number(gapAbs.toFixed(4)) : null,
      GapPct: gapPct != null ? Number(gapPct.toFixed(6)) : null,
      OfficialDailyDevaluation: officialDailyDevaluation,
      ParallelDailyDevaluation: parallelDailyDevaluation,
    })
  }

  return result
}

function clampDailyRate(value: number | null) {
  if (value == null || Number.isNaN(value)) return null
  return Math.max(MIN_DAILY_RATE, value)
}

export function buildForecastModel(rows: FxAppRow[], horizonDays = 30): ForecastModel {
  const sortedRows = [...rows].sort((a, b) => a.Date.localeCompare(b.Date))
  const latestRow = sortedRows.at(-1) ?? null
  const latestDate = latestRow?.Date ?? null

  if (!latestRow || !latestDate) {
    return {
      latestDate: null,
      latestOfficialRate: null,
      latestParallelRate: null,
      latestGapPct: null,
      latestGapAbs: null,
      horizonDays,
      windows: [],
      regularOfficialBase: null,
      regularParallelBase: null,
      officialVolatility: null,
      parallelVolatility: null,
      scenarios: [],
    }
  }

  const officialReturnSeries = buildDailyReturnSeries(sortedRows, "OfficialRate")
  const parallelReturnSeries = buildDailyReturnSeries(sortedRows, "ParallelRate")
  const gapChangeSeries = buildGapChangeSeries(sortedRows)

  const windows = FORECAST_WINDOWS.map((window) => {
    const officialValues = getWindowValues(officialReturnSeries, latestDate, window.days)
    const parallelValues = getWindowValues(parallelReturnSeries, latestDate, window.days)
    const gapValues = getWindowValues(gapChangeSeries, latestDate, window.days)

    return {
      label: window.label,
      days: window.days,
      officialAvgDailyDevaluation: mean(officialValues),
      parallelAvgDailyDevaluation: mean(parallelValues),
      officialStdDev: standardDeviation(officialValues),
      parallelStdDev: standardDeviation(parallelValues),
      gapAvgDailyChangePp: mean(gapValues),
    } satisfies ForecastWindowMetric
  })

  const regularOfficialBase = weightedAverage(
    windows.map((window, index) => ({
      value: window.officialAvgDailyDevaluation,
      weight: FORECAST_WINDOWS[index].weight,
    }))
  )

  const regularParallelBase = weightedAverage(
    windows.map((window, index) => ({
      value: window.parallelAvgDailyDevaluation,
      weight: FORECAST_WINDOWS[index].weight,
    }))
  )

  const officialVolatility = weightedAverage(
    windows.map((window, index) => ({
      value: window.officialStdDev,
      weight: FORECAST_WINDOWS[index].weight,
    }))
  )

  const parallelVolatility = weightedAverage(
    windows.map((window, index) => ({
      value: window.parallelStdDev,
      weight: FORECAST_WINDOWS[index].weight,
    }))
  )

  const scenarios: ForecastScenario[] = [
    {
      name: "regular",
      label: "Regular",
      description:
        "Usa la devaluación diaria promedio ponderada entre ventanas de 7, 14, 30, 52 y 90 días.",
      officialDailyDevaluation: clampDailyRate(regularOfficialBase),
      parallelDailyDevaluation: clampDailyRate(regularParallelBase),
      officialVolatility,
      parallelVolatility,
      projection: buildProjection(
        latestDate,
        horizonDays,
        latestRow.OfficialRate,
        latestRow.ParallelRate,
        clampDailyRate(regularOfficialBase),
        clampDailyRate(regularParallelBase)
      ),
    },
    {
      name: "optimistic",
      label: "Optimista",
      description:
        "Reduce la devaluación base en 0.75 desviaciones estándar para simular menor presión cambiaria.",
      officialDailyDevaluation: clampDailyRate(
        regularOfficialBase != null && officialVolatility != null
          ? regularOfficialBase - officialVolatility * SCENARIO_STD_MULTIPLIER
          : regularOfficialBase
      ),
      parallelDailyDevaluation: clampDailyRate(
        regularParallelBase != null && parallelVolatility != null
          ? regularParallelBase - parallelVolatility * SCENARIO_STD_MULTIPLIER
          : regularParallelBase
      ),
      officialVolatility,
      parallelVolatility,
      projection: buildProjection(
        latestDate,
        horizonDays,
        latestRow.OfficialRate,
        latestRow.ParallelRate,
        clampDailyRate(
          regularOfficialBase != null && officialVolatility != null
            ? regularOfficialBase - officialVolatility * SCENARIO_STD_MULTIPLIER
            : regularOfficialBase
        ),
        clampDailyRate(
          regularParallelBase != null && parallelVolatility != null
            ? regularParallelBase - parallelVolatility * SCENARIO_STD_MULTIPLIER
            : regularParallelBase
        )
      ),
    },
    {
      name: "pessimistic",
      label: "Pesimista",
      description:
        "Incrementa la devaluación base en 0.75 desviaciones estándar para simular mayor presión cambiaria.",
      officialDailyDevaluation: clampDailyRate(
        regularOfficialBase != null && officialVolatility != null
          ? regularOfficialBase + officialVolatility * SCENARIO_STD_MULTIPLIER
          : regularOfficialBase
      ),
      parallelDailyDevaluation: clampDailyRate(
        regularParallelBase != null && parallelVolatility != null
          ? regularParallelBase + parallelVolatility * SCENARIO_STD_MULTIPLIER
          : regularParallelBase
      ),
      officialVolatility,
      parallelVolatility,
      projection: buildProjection(
        latestDate,
        horizonDays,
        latestRow.OfficialRate,
        latestRow.ParallelRate,
        clampDailyRate(
          regularOfficialBase != null && officialVolatility != null
            ? regularOfficialBase + officialVolatility * SCENARIO_STD_MULTIPLIER
            : regularOfficialBase
        ),
        clampDailyRate(
          regularParallelBase != null && parallelVolatility != null
            ? regularParallelBase + parallelVolatility * SCENARIO_STD_MULTIPLIER
            : regularParallelBase
        )
      ),
    },
  ]

  return {
    latestDate,
    latestOfficialRate: latestRow.OfficialRate,
    latestParallelRate: latestRow.ParallelRate,
    latestGapPct: latestRow.GapPct,
    latestGapAbs: latestRow.GapAbs,
    horizonDays,
    windows,
    regularOfficialBase,
    regularParallelBase,
    officialVolatility,
    parallelVolatility,
    scenarios,
  }
}
