import { AppShell } from "@/components/layout/app-shell"
import { KpiCard } from "@/components/kpi-card"
import { fetchFxData } from "@/lib/data/fetch-fx-data"
import {
  firstAvailableInMonth,
  firstAvailableInYear,
  getLatestDate,
  getLatestRow,
} from "@/lib/analytics/kpis"
import { formatCurrency, formatPercent } from "@/lib/analytics/formatters"
import { Activity, BadgeDollarSign, TrendingUp } from "lucide-react"

export default async function SummaryPage() {
  const rows = await fetchFxData()

  const latestDate = getLatestDate(rows)
  const latestRow = getLatestRow(rows)

  let officialMtd: number | null = null
  let officialYtd: number | null = null

  if (latestDate && latestRow?.OfficialRate != null) {
    const monthStart = firstAvailableInMonth(rows, "OfficialRate", latestDate)
    const yearStart = firstAvailableInYear(rows, "OfficialRate", latestDate)

    if (monthStart?.OfficialRate != null) {
      officialMtd =
        (latestRow.OfficialRate - monthStart.OfficialRate) / monthStart.OfficialRate
    }

    if (yearStart?.OfficialRate != null) {
      officialYtd =
        (latestRow.OfficialRate - yearStart.OfficialRate) / yearStart.OfficialRate
    }
  }

  return (
    <AppShell>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Official Rate"
          value={formatCurrency(latestRow?.OfficialRate)}
          subtitle="Latest available value"
          icon={<BadgeDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Parallel Rate"
          value={formatCurrency(latestRow?.ParallelRate)}
          subtitle="Latest available value"
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          title="Gap %"
          value={formatPercent(latestRow?.GapPct)}
          subtitle="Parallel vs Official"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Official YTD"
          value={formatPercent(officialYtd)}
          subtitle="Latest vs first available date of current year"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Official MTD"
          value={formatPercent(officialMtd)}
          subtitle="Latest vs first available date of current month"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </section>
    </AppShell>
  )
}
