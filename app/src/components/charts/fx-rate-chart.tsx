"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Props = {
  data: {
    Date: string
    OfficialRate: number | null
    ParallelRate: number | null
  }[]
}

export function FxRateChart({ data }: Props) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Date" minTickGap={28} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="OfficialRate" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ParallelRate" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
