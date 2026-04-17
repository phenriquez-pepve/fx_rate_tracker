import { AppShell } from "@/components/layout/app-shell"

export default function ForecastPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Planeación
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Forecast
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Próximamente incorporaremos escenarios, supuestos y proyecciones de tipo de cambio.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Página en construcción.
        </div>
      </div>
    </AppShell>
  )
}