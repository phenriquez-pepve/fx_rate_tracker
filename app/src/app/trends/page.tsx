import { AppShell } from "@/components/layout/app-shell"
import { TrendsDashboard } from "@/components/trends/trends-dashboard"
import { fetchFxData } from "@/lib/data/fetch-fx-data"

export default async function TrendsPage() {
  const rows = await fetchFxData()

  return (
    <AppShell rows={rows}>
      <TrendsDashboard rows={rows} />
    </AppShell>
  )
}
