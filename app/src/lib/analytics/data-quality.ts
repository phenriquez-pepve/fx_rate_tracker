import { FxAppRow } from "@/lib/data/types"

type FieldKey = "OfficialRate" | "ParallelRate" | "GapAbs" | "GapPct"
type CarryForwardKey = "OfficialCarriedForward" | "ParallelCarriedForward"

export type DataQualityFieldMetric = {
  label: string
  availableCount: number
  missingCount: number
  coveragePct: number
  carriedForwardCount: number | null
  carriedForwardPct: number | null
  latestAvailableDate: string | null
}

export type DataQualityMetrics = {
  rowCount: number
  startDate: string | null
  endDate: string | null
  duplicateDateCount: number
  latestOfficialDate: string | null
  latestOfficialFreshnessUTC: string | null
  latestParallelDate: string | null
  latestParallelFreshnessUTC: string | null
  official: DataQualityFieldMetric
  parallel: DataQualityFieldMetric
  gapAbs: DataQualityFieldMetric
  gapPct: DataQualityFieldMetric
}

function toPct(part: number, total: number) {
  if (!total) return 0
  return Number(((part / total) * 100).toFixed(1))
}

export function getLatestAvailableRow(
  rows: FxAppRow[],
  key: "OfficialRate" | "ParallelRate",
  options?: { publishedOnly?: boolean }
) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    const carryForwardKey =
      key === "OfficialRate" ? "OfficialCarriedForward" : "ParallelCarriedForward"

    if (row[key] != null && (!options?.publishedOnly || row[carryForwardKey] !== true)) {
      return rows[index]
    }
  }

  return null
}

function buildFieldMetric(
  rows: FxAppRow[],
  label: string,
  key: FieldKey,
  carryForwardKey?: CarryForwardKey
): DataQualityFieldMetric {
  const availableRows = rows.filter((row) => row[key] != null)
  const availableCount = availableRows.length
  const missingCount = rows.length - availableCount
  const carriedForwardCount = carryForwardKey
    ? availableRows.filter((row) => row[carryForwardKey] === true).length
    : null

  return {
    label,
    availableCount,
    missingCount,
    coveragePct: toPct(availableCount, rows.length),
    carriedForwardCount,
    carriedForwardPct:
      carriedForwardCount != null ? toPct(carriedForwardCount, availableCount) : null,
    latestAvailableDate: availableRows.at(-1)?.Date ?? null,
  }
}

export function buildDataQualityMetrics(rows: FxAppRow[]): DataQualityMetrics {
  const sortedRows = [...rows].sort((a, b) => a.Date.localeCompare(b.Date))
  const duplicateDates = new Set<string>()
  const seenDates = new Set<string>()

  sortedRows.forEach((row) => {
    if (seenDates.has(row.Date)) {
      duplicateDates.add(row.Date)
    }

    seenDates.add(row.Date)
  })

  const latestOfficialRow = getLatestAvailableRow(sortedRows, "OfficialRate", {
    publishedOnly: true,
  })
  const latestParallelRow = getLatestAvailableRow(sortedRows, "ParallelRate", {
    publishedOnly: true,
  })

  return {
    rowCount: sortedRows.length,
    startDate: sortedRows[0]?.Date ?? null,
    endDate: sortedRows.at(-1)?.Date ?? null,
    duplicateDateCount: duplicateDates.size,
    latestOfficialDate: latestOfficialRow?.Date ?? null,
    latestOfficialFreshnessUTC: latestOfficialRow?.DataFreshnessUTC ?? null,
    latestParallelDate: latestParallelRow?.Date ?? null,
    latestParallelFreshnessUTC: latestParallelRow?.DataFreshnessUTC ?? null,
    official: buildFieldMetric(
      sortedRows,
      "Tasa oficial",
      "OfficialRate",
      "OfficialCarriedForward"
    ),
    parallel: buildFieldMetric(
      sortedRows,
      "Tasa paralela",
      "ParallelRate",
      "ParallelCarriedForward"
    ),
    gapAbs: buildFieldMetric(sortedRows, "Brecha abs.", "GapAbs"),
    gapPct: buildFieldMetric(sortedRows, "Brecha %", "GapPct"),
  }
}
