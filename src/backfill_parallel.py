import pandas as pd
import requests

from common import now_utc_iso, replace_full_history, save_history


CSV_PATH = "data/fx_parallel_ves_usd_history.csv"
HIST_URL = "https://ve.dolarapi.com/v1/historicos/dolares/paralelo"
START_DATE = "2024-01-01"


def fetch_historical_parallel(timeout_seconds: int = 60) -> pd.DataFrame:
    response = requests.get(HIST_URL, timeout=timeout_seconds)
    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list):
        raise ValueError(f"Unexpected parallel historical response: {data}")

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
    df = df[df["Date"] >= START_DATE]
    df = df.drop_duplicates(subset=["Date"], keep="last")
    return df


def main() -> None:
    hist_df = fetch_historical_parallel()
    final_df = replace_full_history(
        new_df=hist_df,
        rate_type="Parallel FX",
        source="DolarAPI Paralelo Histórico",
        load_timestamp_utc=now_utc_iso(),
    )
    save_history(final_df, CSV_PATH)

    print(f"Backfilled {CSV_PATH} with {len(final_df)} rows")


if __name__ == "__main__":
    main()
