import { FxAppRow } from "@/lib/data/types"

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function monthStart(dateStr: string) {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
}

function yearStart(dateStr: string) {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    .toISOString()
    .slice(0, 10)
}

function sameDateLastYear(dateStr: string) {
  const d = new Date(dateStr)
  d.setUTCFullYear(d.getUTCFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function averageBetween(
  rows: FxAppRow[],
  key: "OfficialRate" | "ParallelRate",
  start: string,
  end: string
) {
  const values = rows
    .filter((r) => r.Date >= start && r.Date <= end)
    .map((r) => r[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))

  return average(values)
}

export function getOfficialComparisons(rows: FxAppRow[]) {
  if (!rows.length) {
    return {
      monthVsPy: null,
      ytdVsPy: null,
    }
  }

  const latestDate = rows[rows.length - 1].Date
  const currentMonthStart = monthStart(latestDate)
  const currentYearStart = yearStart(latestDate)

  const latestDatePy = sameDateLastYear(latestDate)
  const monthStartPy = sameDateLastYear(currentMonthStart)
  const yearStartPy = sameDateLastYear(currentYearStart)

  const monthAvg = averageBetween(rows, "OfficialRate", currentMonthStart, latestDate)
  const monthAvgPy = averageBetween(rows, "OfficialRate", monthStartPy, latestDatePy)

  const ytdAvg = averageBetween(rows, "OfficialRate", currentYearStart, latestDate)
  const ytdAvgPy = averageBetween(rows, "OfficialRate", yearStartPy, latestDatePy)

  return {
    monthVsPy:
      monthAvg != null && monthAvgPy != null ? (monthAvg - monthAvgPy) / monthAvgPy : null,
    ytdVsPy:
      ytdAvg != null && ytdAvgPy != null ? (ytdAvg - ytdAvgPy) / ytdAvgPy : null,
  }
}
