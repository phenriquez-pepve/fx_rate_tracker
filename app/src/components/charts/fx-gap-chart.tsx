"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Props = {
  data: {
    Date: string
    GapPct: number | null
    GapAbs: number | null
  }[]
}

export function FxGapChart({ data }: Props) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Date" minTickGap={28} />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="GapPct" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
