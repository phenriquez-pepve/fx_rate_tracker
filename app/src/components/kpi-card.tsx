import { Card, CardContent } from "@/components/ui/card"
import { ReactNode } from "react"

type Props = {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
}

export function KpiCard({ title, value, subtitle, icon }: Props) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {value}
            </p>
            {subtitle ? (
              <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {icon ? (
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
