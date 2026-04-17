import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MethodologyPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Methodology</h2>
          <p className="text-sm text-slate-500">
            Data sources, business definitions, and important implementation notes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Official FX:</span> DolarAPI official
                feed.
              </p>
              <p>
                <span className="font-medium text-slate-900">Parallel FX:</span> DolarAPI parallel
                feed.
              </p>
              <p>
                <span className="font-medium text-slate-900">Dataset refresh:</span> historical
                backfill + daily updates + merged app dataset.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Weekends and holidays are filled by carrying forward the latest available value.</p>
              <p>Parallel history starts on 2026-02-14 and is intentionally blank before that date.</p>
              <p>
                KPI calculations should anchor to the latest available date and use robust monthly
                and yearly start logic.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}