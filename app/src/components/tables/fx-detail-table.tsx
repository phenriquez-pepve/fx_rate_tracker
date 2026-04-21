"use client"

import { useMemo, useState } from "react"
import { CalendarRange, Download } from "lucide-react"

import { formatCurrency, formatPercent } from "@/lib/analytics/formatters"
import { FxAppRow } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

function getDeltaColorClass(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || value === 0) return "text-slate-900"
  return value > 0 ? "text-red-600" : "text-emerald-600"
}

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value)

  if (!/[",\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

export function FxDetailTable({ rows }: Props) {
  const [search, setSearch] = useState("")
  const [preset, setPreset] = useState<PresetRange>("lastMonth")
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

    return [...rows]
      .reverse()
      .filter((row) => {
        const matchesSearch = !term || row.Date.includes(term)
        const matchesStart = !activeRange.startDate || row.Date >= activeRange.startDate
        const matchesEnd = !activeRange.endDate || row.Date <= activeRange.endDate

        return matchesSearch && matchesStart && matchesEnd
      })
  }, [activeRange.endDate, activeRange.startDate, rows, search])

  function handlePresetChange(nextPreset: PresetRange) {
    setPreset(nextPreset)

    if (nextPreset !== "custom") {
      setCustomStartDate("")
      setCustomEndDate("")
    }
  }

  function handleClearSearch() {
    setSearch("")
  }

  function handleExportCsv() {
    const headers = [
      "Fecha",
      "Tasa oficial",
      "Tasa paralela",
      "Brecha abs.",
      "Brecha %",
    ]

    const lines = filteredRows.map((row) =>
      [row.Date, row.OfficialRate, row.ParallelRate, row.GapAbs, row.GapPct]
        .map((value) => escapeCsv(value))
        .join(",")
    )

    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const start = activeRange.startDate || minDate || "inicio"
    const end = activeRange.endDate || maxDate || "fin"

    link.href = url
    link.download = `fx-detalle-${start}_a_${end}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarRange className="h-4 w-4" />
              <span>Rango de fechas</span>
            </div>

            <div className="flex min-w-0 flex-wrap gap-2">
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

          <div className="flex min-w-0 w-full flex-col gap-3 xl:max-w-4xl xl:flex-row xl:items-end xl:justify-end">
            <div className="w-full min-w-0 xl:max-w-xs">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Buscar fecha
                </label>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-500"
                  onClick={handleClearSearch}
                  disabled={!search}
                >
                  Limpiar filtro
                </Button>
              </div>
              <Input
                type="date"
                aria-label="Buscar fecha"
                min={minDate || undefined}
                max={maxDate || undefined}
                className="mt-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-full min-w-0 xl:min-w-[320px]">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Buscar rango
              </label>
              <div className="mt-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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

            <Button type="button" variant="outline" className="xl:mb-0" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tasa oficial</th>
              <th className="px-4 py-3 font-medium">Tasa paralela</th>
              <th className="px-4 py-3 font-medium">Brecha abs.</th>
              <th className="px-4 py-3 font-medium">Brecha %</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.Date} className="border-t border-slate-200 bg-white">
                  <td className="px-4 py-3">{row.Date}</td>
                  <td className="px-4 py-3">{formatCurrency(row.OfficialRate)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.ParallelRate)}</td>
                  <td className={`px-4 py-3 font-medium ${getDeltaColorClass(row.GapAbs)}`}>
                    {formatCurrency(row.GapAbs)}
                  </td>
                  <td className={`px-4 py-3 font-medium ${getDeltaColorClass(row.GapPct)}`}>
                    {formatPercent(row.GapPct)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-200 bg-white">
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay registros dentro del rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
