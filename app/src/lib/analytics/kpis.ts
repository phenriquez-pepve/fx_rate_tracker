import { FxAppRow } from "@/lib/data/types"

export function getLatestDate(rows: FxAppRow[]) {
  return rows.length ? rows[rows.length - 1].Date : null
}

export function getLatestRow(rows: FxAppRow[]) {
  const latestDate = getLatestDate(rows)
  return rows.find((r) => r.Date === latestDate) ?? null
}

export function firstAvailableInMonth(
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

export function firstAvailableInYear(
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
