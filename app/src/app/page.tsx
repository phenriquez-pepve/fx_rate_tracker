import { AppShell } from "@/components/layout/app-shell"
import { fetchFxData } from "@/lib/data/fetch-fx-data"
import { SummaryDashboard } from "@/components/summary/summary-dashboard"

export default async function SummaryPage() {
  const rows = await fetchFxData()

  return (
    <AppShell rows={rows}>
      <SummaryDashboard rows={rows} />
    </AppShell>
  )
}
