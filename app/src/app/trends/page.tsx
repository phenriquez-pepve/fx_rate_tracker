import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFxData } from "@/lib/data/fetch-fx-data"
import { getLatestRow } from "@/lib/analytics/kpis"
import { FxRateChart } from "@/components/charts/fx-rate-chart"
import { FxGapChart } from "@/components/charts/fx-gap-chart"
import { buildGapSeries, buildRateSeries } from "@/lib/analytics/series"

export default async function TrendsPage() {
  const rows = await fetchFxData()
  const latestRow = getLatestRow(rows)

  const rateSeries = buildRateSeries(rows)
  const gapSeries = buildGapSeries(rows)

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Trends</h2>
          <p className="text-sm text-slate-500">
            Daily behavior for Official and Parallel rates, plus gap monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Official vs Parallel Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <FxRateChart data={rateSeries} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Latest Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Official carry-forward</p>
                <p className="mt-1">
                  {latestRow?.OfficialCarriedForward
                    ? "Yes — latest official value was carried forward."
                    : "No — latest official value is published."}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Parallel carry-forward</p>
                <p className="mt-1">
                  {latestRow?.ParallelCarriedForward
                    ? "Yes — latest parallel value was carried forward."
                    : "No — latest parallel value is published."}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Parallel history note</p>
                <p className="mt-1">
                  Parallel history begins on 2026-02-14. Earlier dates remain blank by design.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Gap % Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <FxGapChart data={gapSeries} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
