"use client"

import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { FxAppRow } from "@/lib/data/types"
import { formatCurrency, formatPercent } from "@/lib/analytics/formatters"
import { useMemo, useState } from "react"

type Props = {
  rows: FxAppRow[]
}

export function FxDetailTable({ rows }: Props) {
  const [search, setSearch] = useState("")

  const filteredRows = useMemo(() => {
    if (!search.trim()) return [...rows].reverse()
    return [...rows]
      .reverse()
      .filter((r) => r.Date.includes(search.trim()))
  }, [rows, search])

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Input
          placeholder="Search by date (YYYY-MM-DD)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Official</th>
              <th className="px-4 py-3 font-medium">Official CF</th>
              <th className="px-4 py-3 font-medium">Parallel</th>
              <th className="px-4 py-3 font-medium">Parallel CF</th>
              <th className="px-4 py-3 font-medium">Gap Abs</th>
              <th className="px-4 py-3 font-medium">Gap %</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.Date} className="border-t border-slate-200 bg-white">
                <td className="px-4 py-3">{row.Date}</td>
                <td className="px-4 py-3">{formatCurrency(row.OfficialRate)}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    active={row.OfficialCarriedForward}
                    trueLabel="Carried"
                    falseLabel="Published"
                  />
                </td>
                <td className="px-4 py-3">{formatCurrency(row.ParallelRate)}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    active={row.ParallelCarriedForward}
                    trueLabel="Carried"
                    falseLabel="Published"
                  />
                </td>
                <td className="px-4 py-3">{formatCurrency(row.GapAbs)}</td>
                <td className="px-4 py-3">{formatPercent(row.GapPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
