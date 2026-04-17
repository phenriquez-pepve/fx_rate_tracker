import { APP_DATASET_URL } from "@/lib/constants"
import { parseCsv } from "./parse-csv"
import { FxAppRow } from "./types"

export async function fetchFxData(): Promise<FxAppRow[]> {
  const res = await fetch(APP_DATASET_URL, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch FX dataset: ${res.status}`)
  }

  const text = await res.text()
  const rows = parseCsv(text)

  if (!rows.length) {
    throw new Error("FX dataset is empty")
  }

  return rows.sort((a, b) => a.Date.localeCompare(b.Date))
}
