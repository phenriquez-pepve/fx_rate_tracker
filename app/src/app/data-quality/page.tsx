import { Activity, CalendarRange, Database } from "lucide-react"

import { AppShell } from "@/components/layout/app-shell"
import { KpiCard } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildDataQualityMetrics } from "@/lib/analytics/data-quality"
import { fetchFxData } from "@/lib/data/fetch-fx-data"

function formatDate(value: string | null) {
  if (!value) return "N/A"

  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  })
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `${date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  })} · ${date.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })} UTC`
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export default async function DataQualityPage() {
  const rows = await fetchFxData()
  const metrics = buildDataQualityMetrics(rows)
  const fieldMetrics = [
    metrics.official,
    metrics.parallel,
    metrics.gapAbs,
    metrics.gapPct,
  ]

  return (
    <AppShell rows={rows}>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Monitoreo
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Calidad de datos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Validaciones básicas de cobertura, continuidad, frescura y consistencia del dataset consolidado.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Filas del dataset"
            value={metrics.rowCount.toLocaleString("es-VE")}
            subtitle={`${formatDate(metrics.startDate)} a ${formatDate(metrics.endDate)}`}
            icon={<Database className="h-5 w-5" />}
          />
          <KpiCard
            title="Cobertura oficial"
            value={formatPercent(metrics.official.coveragePct)}
            subtitle={`${metrics.official.availableCount} días con dato`}
            icon={<Activity className="h-5 w-5" />}
          />
          <KpiCard
            title="Cobertura paralela"
            value={formatPercent(metrics.parallel.coveragePct)}
            subtitle={`${metrics.parallel.availableCount} días con dato`}
            icon={<Activity className="h-5 w-5" />}
          />
          <KpiCard
            title="Fechas duplicadas"
            value={metrics.duplicateDateCount.toLocaleString("es-VE")}
            subtitle="Debe permanecer en 0"
            icon={<CalendarRange className="h-5 w-5" />}
            delta={metrics.duplicateDateCount > 0 ? `+${metrics.duplicateDateCount}` : "0"}
            deltaPositiveIsBad
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Freshness de la tasa oficial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Última fecha oficial disponible</p>
                <p className="mt-1">{formatDate(metrics.latestOfficialDate)}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Último refresh UTC</p>
                <p className="mt-1">{formatDateTime(metrics.latestOfficialFreshnessUTC)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Continuidad del dataset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Carry-forward oficial</p>
                <p className="mt-1">
                  {metrics.official.carriedForwardCount?.toLocaleString("es-VE") ?? "0"} días
                  ({formatPercent(metrics.official.carriedForwardPct ?? 0)})
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Carry-forward paralelo</p>
                <p className="mt-1">
                  {metrics.parallel.carriedForwardCount?.toLocaleString("es-VE") ?? "0"} días
                  ({formatPercent(metrics.parallel.carriedForwardPct ?? 0)})
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalle por campo</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Campo</th>
                    <th className="px-4 py-3 font-medium">Cobertura</th>
                    <th className="px-4 py-3 font-medium">Disponibles</th>
                    <th className="px-4 py-3 font-medium">Faltantes</th>
                    <th className="px-4 py-3 font-medium">Carry-forward</th>
                    <th className="px-4 py-3 font-medium">Última fecha con dato</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldMetrics.map((metric) => (
                    <tr key={metric.label} className="border-t border-slate-200 bg-white">
                      <td className="px-4 py-3 font-medium text-slate-900">{metric.label}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatPercent(metric.coveragePct)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {metric.availableCount.toLocaleString("es-VE")}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {metric.missingCount.toLocaleString("es-VE")}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {metric.carriedForwardCount != null
                          ? `${metric.carriedForwardCount.toLocaleString("es-VE")} (${formatPercent(metric.carriedForwardPct ?? 0)})`
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(metric.latestAvailableDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lectura rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              La cobertura oficial debería tender a 100% por el uso de carry-forward en días no operativos.
            </p>
            <p>
              La cobertura paralela puede ser menor en la historia temprana porque la serie inicia más tarde que la oficial.
            </p>
            <p>
              El indicador de freshness toma la última fila con tasa oficial disponible y muestra el timestamp UTC asociado en el dataset.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
