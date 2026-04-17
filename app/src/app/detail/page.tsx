import { AppShell } from "@/components/layout/app-shell"
import { FxDetailTable } from "@/components/tables/fx-detail-table"
import { fetchFxData } from "@/lib/data/fetch-fx-data"

export default async function DetailPage() {
  const rows = await fetchFxData()

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Detail</h2>
          <p className="text-sm text-slate-500">
            Daily app dataset with carried-forward transparency.
          </p>
        </div>

        <FxDetailTable rows={rows} />
      </div>
    </AppShell>
  )
}