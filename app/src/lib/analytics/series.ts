import { FxAppRow } from "@/lib/data/types"

export function buildRateSeries(rows: FxAppRow[]) {
  return rows.map((row) => ({
    Date: row.Date,
    OfficialRate: row.OfficialRate,
    ParallelRate: row.ParallelRate,
  }))
}

export function buildGapSeries(rows: FxAppRow[]) {
  return rows
    .filter((row) => row.GapPct != null || row.GapAbs != null)
    .map((row) => ({
      Date: row.Date,
      GapPct: row.GapPct != null ? Number((row.GapPct * 100).toFixed(1)) : null,
      GapAbs: row.GapAbs,
    }))
}
