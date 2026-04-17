import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MethodologyPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Documentación
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Metodología
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fuentes de datos, reglas de construcción del dataset y notas de interpretación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fuentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Tasa oficial:</span> feed oficial de DolarAPI.
              </p>
              <p>
                <span className="font-medium text-slate-900">Tasa paralela:</span> feed paralelo de DolarAPI.
              </p>
              <p>
                <span className="font-medium text-slate-900">Refresh:</span> backfill histórico + actualización diaria + dataset final para la app.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reglas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Fines de semana y feriados se completan usando el último valor disponible mediante carry-forward.
              </p>
              <p>
                El histórico paralelo inicia el 14-02-2026 y permanece en blanco antes de esa fecha.
              </p>
              <p>
                Los KPIs se anclan a la última fecha disponible y usan lógica robusta para inicio de mes y año.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}