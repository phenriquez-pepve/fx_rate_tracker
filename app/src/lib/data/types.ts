export type FxAppRow = {
  Date: string
  OfficialRate: number | null
  OfficialCarriedForward: boolean | null
  ParallelRate: number | null
  ParallelCarriedForward: boolean | null
  GapAbs: number | null
  GapPct: number | null
  DataFreshnessUTC: string
}
