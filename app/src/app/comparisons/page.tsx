import { AppShell } from "@/components/layout/app-shell"
import { KpiCard } from "@/components/kpi-card"
import { fetchFxData } from "@/lib/data/fetch-fx-data"
import { getOfficialComparisons } from "@/lib/analytics/comparisons"
import { formatPercent } from "@/lib/analytics/formatters"
import { TrendingUp } from "lucide-react"

export default async function ComparisonsPage() {
  const rows = await fetchFxData()
  const comparisons = getOfficialComparisons(rows)

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Comparisons</h2>
          <p className="text-sm text-slate-500">
            Period-over-period views anchored to the latest available date.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Official Month Avg vs PY"
            value={formatPercent(comparisons.monthVsPy)}
            subtitle="Current month average vs same period last year"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            title="Official YTD Avg vs PY"
            value={formatPercent(comparisons.ytdVsPy)}
            subtitle="Current YTD average vs same period last year"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      </div>
    </AppShell>
  )
}