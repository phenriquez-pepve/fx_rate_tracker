from datetime import datetime, timezone
import pandas as pd
import requests

from common import forward_fill_calendar_history, now_utc_iso, save_history


CSV_PATH = "data/fx_official_ves_usd_history.csv"
HIST_URL = "https://ve.dolarapi.com/v1/historicos/dolares/oficial"
START_DATE = "2024-01-01"


def fetch_historical_official(timeout_seconds: int = 60) -> pd.DataFrame:
    response = requests.get(HIST_URL, timeout=timeout_seconds)
    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list):
        raise ValueError(f"Unexpected official historical response: {data}")

    rows = []
    for item in data:
        fecha = item.get("fecha")
        promedio = item.get("promedio")

        if fecha is None or promedio is None:
            continue

        rows.append({
            "Date": str(fecha)[:10],
            "ExchangeRate": float(promedio),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        raise ValueError("Official historical response returned no usable rows.")

    df["Date"] = pd.to_datetime(df["Date"])
    df = df[df["Date"] >= pd.to_datetime(START_DATE)]
    df = df.sort_values("Date").drop_duplicates(subset=["Date"], keep="last")

    return df


def main() -> None:
    hist_df = fetch_historical_official()
    end_date = datetime.now(timezone.utc).date().isoformat()

    final_df = forward_fill_calendar_history(
        df=hist_df,
        start_date=START_DATE,
        end_date=end_date,
        rate_type="Official FX",
        source="DolarAPI Oficial Histórico (calendar-filled)",
        load_timestamp_utc=now_utc_iso(),
    )

    save_history(final_df, CSV_PATH)
    print(f"Backfilled {CSV_PATH} with {len(final_df)} calendar-daily rows")


if __name__ == "__main__":
    main()
