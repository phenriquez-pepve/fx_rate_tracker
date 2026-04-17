import { AppShell } from "@/components/layout/app-shell"
import { FxDetailTable } from "@/components/tables/fx-detail-table"
import { fetchFxData } from "@/lib/data/fetch-fx-data"

export default async function DetailPage() {
  const rows = await fetchFxData()

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Exploración
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Detalle diario
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Dataset diario consolidado con filtros por fecha, exportación CSV y cálculo de brecha.
          </p>
        </div>

        <FxDetailTable rows={rows} />
      </div>
    </AppShell>
  )
}
