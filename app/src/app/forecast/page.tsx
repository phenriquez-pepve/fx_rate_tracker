import { AppShell } from "@/components/layout/app-shell"
import { ForecastDashboard } from "@/components/forecast/forecast-dashboard"
import { fetchFxData } from "@/lib/data/fetch-fx-data"

export default async function ForecastPage() {
  const rows = await fetchFxData()

  return (
    <AppShell>
      <ForecastDashboard rows={rows} />
    </AppShell>
  )
}
