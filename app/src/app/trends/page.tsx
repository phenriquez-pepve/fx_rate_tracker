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
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Análisis
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Tendencias
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Evolución diaria de tasas oficial y paralela, junto con el comportamiento de la brecha.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tasa oficial vs. paralela</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <FxRateChart data={rateSeries} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estado más reciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Carry-forward oficial</p>
                <p className="mt-1">
                  {latestRow?.OfficialCarriedForward
                    ? "Sí — el último valor oficial fue arrastrado."
                    : "No — el último valor oficial fue publicado."}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Carry-forward paralelo</p>
                <p className="mt-1">
                  {latestRow?.ParallelCarriedForward
                    ? "Sí — el último valor paralelo fue arrastrado."
                    : "No — el último valor paralelo fue publicado."}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Nota histórica</p>
                <p className="mt-1">
                  El histórico paralelo inicia el 14-02-2026. Las fechas previas permanecen vacías por diseño.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia de brecha (%)</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <FxGapChart data={gapSeries} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}