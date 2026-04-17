from datetime import datetime
import requests

from common import load_history, now_utc_iso, save_history, upsert_daily_row


CSV_PATH = "data/fx_parallel_ves_usd_history.csv"
CURRENT_URL = "https://ve.dolarapi.com/v1/dolares/paralelo"


def fetch_current_parallel_rate(timeout_seconds: int = 30) -> tuple[str, float]:
    response = requests.get(CURRENT_URL, timeout=timeout_seconds)
    response.raise_for_status()
    data = response.json()

    if "promedio" not in data or "fechaActualizacion" not in data:
        raise ValueError(f"Unexpected parallel FX response: {data}")

    rate = float(data["promedio"])
    dt = datetime.fromisoformat(data["fechaActualizacion"].replace("Z", "+00:00"))
    date_value = dt.date().isoformat()

    return date_value, rate


def main() -> None:
    date_value, rate = fetch_current_parallel_rate()
    print(f"Parallel FX parsed: {date_value} -> {rate}")

    df = load_history(CSV_PATH)
    df = upsert_daily_row(
        df=df,
        date_value=date_value,
        rate_type="Parallel FX",
        exchange_rate=rate,
        source="DolarAPI Paralelo",
        load_timestamp_utc=now_utc_iso(),
    )
    save_history(df, CSV_PATH)

    print(f"Updated {CSV_PATH}")


if __name__ == "__main__":
    main()
