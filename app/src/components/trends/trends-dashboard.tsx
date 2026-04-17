"use client"

import { useMemo, useState } from "react"
import { CalendarRange } from "lucide-react"

import { FxGapChart } from "@/components/charts/fx-gap-chart"
import { FxRateChart } from "@/components/charts/fx-rate-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getLatestRow } from "@/lib/analytics/kpis"
import { buildGapSeries, buildRateSeries } from "@/lib/analytics/series"
import { FxAppRow } from "@/lib/data/types"

type Props = {
  rows: FxAppRow[]
}

type PresetRange = "all" | "lastWeek" | "lastMonth" | "currentYear" | "custom"

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseUtcDate(value: string) {
  return new Date(`${value}T00:00:00Z`)
}

function shiftUtcDate(value: string, amount: number, unit: "days" | "months") {
  const date = parseUtcDate(value)

  if (unit === "days") {
    date.setUTCDate(date.getUTCDate() + amount)
  } else {
    date.setUTCMonth(date.getUTCMonth() + amount)
  }

  return toIsoDate(date)
}

function getPresetRange(preset: Exclude<PresetRange, "custom">, latestDate: string | null) {
  if (!latestDate || preset === "all") {
    return { startDate: "", endDate: latestDate ?? "" }
  }

  if (preset === "lastWeek") {
    return { startDate: shiftUtcDate(latestDate, -6, "days"), endDate: latestDate }
  }

  if (preset === "lastMonth") {
    return { startDate: shiftUtcDate(latestDate, -1, "months"), endDate: latestDate }
  }

  const latest = parseUtcDate(latestDate)

  return {
    startDate: `${latest.getUTCFullYear()}-01-01`,
    endDate: latestDate,
  }
}

export function TrendsDashboard({ rows }: Props) {
  const [search, setSearch] = useState("")
  const [preset, setPreset] = useState<PresetRange>("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.Date.localeCompare(b.Date)),
    [rows]
  )

  const minDate = sortedRows[0]?.Date ?? ""
  const maxDate = sortedRows.at(-1)?.Date ?? ""

  const activeRange = useMemo(() => {
    if (preset === "custom") {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }

    return getPresetRange(preset, maxDate)
  }, [customEndDate, customStartDate, maxDate, preset])

  const filteredRows = useMemo(() => {
    const term = search.trim()

    return sortedRows.filter((row) => {
      const matchesSearch = !term || row.Date.includes(term)
      const matchesStart = !activeRange.startDate || row.Date >= activeRange.startDate
      const matchesEnd = !activeRange.endDate || row.Date <= activeRange.endDate

      return matchesSearch && matchesStart && matchesEnd
    })
  }, [activeRange.endDate, activeRange.startDate, search, sortedRows])

  const latestRow = useMemo(() => getLatestRow(filteredRows), [filteredRows])
  const rateSeries = useMemo(() => buildRateSeries(filteredRows), [filteredRows])
  const gapSeries = useMemo(() => buildGapSeries(filteredRows), [filteredRows])

  function handlePresetChange(nextPreset: PresetRange) {
    setPreset(nextPreset)

    if (nextPreset !== "custom") {
      setCustomStartDate("")
      setCustomEndDate("")
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Análisis
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Tendencias
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Evolución diaria de tasas oficial y paralela, junto con el comportamiento de la brecha.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarRange className="h-4 w-4" />
              <span>Rango de fechas</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: "all" as const, label: "Todo" },
                { value: "lastWeek" as const, label: "Última semana" },
                { value: "lastMonth" as const, label: "Último mes" },
                { value: "currentYear" as const, label: "Año actual" },
                { value: "custom" as const, label: "Personalizado" },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={preset === option.value ? "default" : "outline"}
                  onClick={() => handlePresetChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:max-w-4xl xl:flex-row xl:items-end xl:justify-end">
            <div className="w-full xl:max-w-xs">
              <Input
                placeholder="Buscar por fecha (AAAA-MM-DD)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[320px]">
              <Input
                type="date"
                aria-label="Fecha inicial"
                min={minDate || undefined}
                max={maxDate || undefined}
                value={activeRange.startDate}
                onChange={(e) => {
                  setPreset("custom")
                  setCustomStartDate(e.target.value)
                }}
              />
              <Input
                type="date"
                aria-label="Fecha final"
                min={minDate || undefined}
                max={maxDate || undefined}
                value={activeRange.endDate}
                onChange={(e) => {
                  setPreset("custom")
                  setCustomEndDate(e.target.value)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasa oficial vs. paralela</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <FxRateChart data={rateSeries} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado más reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Carry-forward oficial</p>
              <p className="mt-1">
                {latestRow?.OfficialCarriedForward
                  ? "Sí — el último valor oficial fue arrastrado."
                  : "No — el último valor oficial fue publicado."}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Carry-forward paralelo</p>
              <p className="mt-1">
                {latestRow?.ParallelCarriedForward
                  ? "Sí — el último valor paralelo fue arrastrado."
                  : "No — el último valor paralelo fue publicado."}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Nota histórica</p>
              <p className="mt-1">
                El histórico paralelo inicia el 14-02-2026. Las fechas previas permanecen vacías por diseño.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendencia de brecha (%)</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <FxGapChart data={gapSeries} />
        </CardContent>
      </Card>
    </div>
  )
}
