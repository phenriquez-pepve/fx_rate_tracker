from datetime import datetime, timezone
import pandas as pd
import requests

from common import load_history, now_utc_iso, save_history, upsert_daily_row


CSV_PATH = "data/fx_official_ves_usd_history.csv"
CURRENT_URL = "https://ve.dolarapi.com/v1/dolares/oficial"


def fetch_current_official_rate(timeout_seconds: int = 30) -> tuple[str, float]:
    response = requests.get(CURRENT_URL, timeout=timeout_seconds)
    response.raise_for_status()
    data = response.json()

    if "promedio" not in data or "fechaActualizacion" not in data:
        raise ValueError(f"Unexpected official FX response: {data}")

    rate = float(data["promedio"])
    dt = datetime.fromisoformat(data["fechaActualizacion"].replace("Z", "+00:00"))
    source_date = dt.date().isoformat()

    return source_date, rate


def main() -> None:
    today_utc = datetime.now(timezone.utc).date().isoformat()
    source_date, rate = fetch_current_official_rate()

    df = load_history(CSV_PATH)

    # Always ensure today's row exists.
    # If the API has not published a new value for today yet (weekend/holiday/non-publishing day),
    # carry forward the latest available rate into today's date.
    if source_date != today_utc:
        if df.empty:
            raise ValueError(
                f"Official API returned source date {source_date}, not today {today_utc}, "
                "and there is no prior stored value to carry forward."
            )
        last_rate = float(pd.to_numeric(df["ExchangeRate"], errors="coerce").dropna().iloc[-1])
        effective_rate = last_rate
        source_label = "DolarAPI Oficial (carried forward)"
    else:
        effective_rate = rate
        source_label = "DolarAPI Oficial"

    print(f"Official FX effective load: {today_utc} -> {effective_rate}")

    df = upsert_daily_row(
        df=df,
        date_value=today_utc,
        rate_type="Official FX",
        exchange_rate=effective_rate,
        source=source_label,
        load_timestamp_utc=now_utc_iso(),
    )
    save_history(df, CSV_PATH)

    print(f"Updated {CSV_PATH}")


if __name__ == "__main__":
    main()
