export type PresetRange = "all" | "lastWeek" | "lastMonth" | "currentYear" | "custom"

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

export function getPresetRange(
  preset: Exclude<PresetRange, "custom">,
  latestDate: string | null
) {
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
