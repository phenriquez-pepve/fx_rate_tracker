import { FxAppRow } from "./types"

export function parseCsv(text: string): FxAppRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))

    const toNumber = (v: string) => {
      if (!v) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const toBool = (v: string) => {
      if (v === "true") return true
      if (v === "false") return false
      return null
    }

    return {
      Date: String(row.Date ?? ""),
      OfficialRate: toNumber(String(row.OfficialRate ?? "")),
      OfficialCarriedForward: toBool(String(row.OfficialCarriedForward ?? "")),
      ParallelRate: toNumber(String(row.ParallelRate ?? "")),
      ParallelCarriedForward: toBool(String(row.ParallelCarriedForward ?? "")),
      GapAbs: toNumber(String(row.GapAbs ?? "")),
      GapPct: toNumber(String(row.GapPct ?? "")),
      DataFreshnessUTC: String(row.DataFreshnessUTC ?? ""),
    }
  })
}
