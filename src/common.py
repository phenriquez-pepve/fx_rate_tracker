from datetime import datetime, timezone
from pathlib import Path
import pandas as pd


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_history(csv_path: str) -> pd.DataFrame:
    path = Path(csv_path)

    if not path.exists():
        return pd.DataFrame(
            columns=["Date", "RateType", "ExchangeRate", "Source", "LoadTimestampUTC"]
        )

    df = pd.read_csv(path)

    expected_cols = ["Date", "RateType", "ExchangeRate", "Source", "LoadTimestampUTC"]
    for col in expected_cols:
        if col not in df.columns:
            df[col] = None

    df = df[expected_cols].copy()
    if not df.empty:
        df["Date"] = pd.to_datetime(df["Date"]).dt.date.astype(str)
        df["ExchangeRate"] = pd.to_numeric(df["ExchangeRate"], errors="coerce")
        df = df.dropna(subset=["ExchangeRate"])
        df = df.sort_values("Date").reset_index(drop=True)

    return df


def save_history(df: pd.DataFrame, csv_path: str) -> None:
    path = Path(csv_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def upsert_daily_row(
    df: pd.DataFrame,
    date_value: str,
    rate_type: str,
    exchange_rate: float,
    source: str,
    load_timestamp_utc: str,
) -> pd.DataFrame:
    if not df.empty:
        df["Date"] = df["Date"].astype(str)
        df = df[df["Date"] != date_value]

    new_row = pd.DataFrame([
        {
            "Date": date_value,
            "RateType": rate_type,
            "ExchangeRate": exchange_rate,
            "Source": source,
            "LoadTimestampUTC": load_timestamp_utc,
        }
    ])

    df = pd.concat([df, new_row], ignore_index=True)
    df["Date"] = pd.to_datetime(df["Date"]).dt.date.astype(str)
    df["ExchangeRate"] = pd.to_numeric(df["ExchangeRate"], errors="coerce")
    df = df.dropna(subset=["ExchangeRate"])
    df = df.sort_values("Date").reset_index(drop=True)

    return df


def replace_full_history(
    new_df: pd.DataFrame,
    rate_type: str,
    source: str,
    load_timestamp_utc: str,
) -> pd.DataFrame:
    df = new_df.copy()
    df["Date"] = pd.to_datetime(df["Date"]).dt.date.astype(str)
    df["RateType"] = rate_type
    df["Source"] = source
    df["LoadTimestampUTC"] = load_timestamp_utc
    df["ExchangeRate"] = pd.to_numeric(df["ExchangeRate"], errors="coerce")
    df = df.dropna(subset=["ExchangeRate"])
    df = df.sort_values("Date").reset_index(drop=True)
    return df


def forward_fill_calendar_history(
    df: pd.DataFrame,
    start_date: str,
    end_date: str,
    rate_type: str,
    source: str,
    load_timestamp_utc: str,
) -> pd.DataFrame:
    """
    Builds a calendar-daily series from sparse market dates by forward-filling
    the latest available value until a new one appears.
    """
    if df.empty:
        raise ValueError("Cannot forward-fill an empty history dataframe.")

    base = df.copy()
    base["Date"] = pd.to_datetime(base["Date"])
    base["ExchangeRate"] = pd.to_numeric(base["ExchangeRate"], errors="coerce")
    base = base.dropna(subset=["ExchangeRate"])
    base = base.sort_values("Date").drop_duplicates(subset=["Date"], keep="last")

    full_calendar = pd.DataFrame({
        "Date": pd.date_range(start=start_date, end=end_date, freq="D")
    })

    merged = pd.merge(full_calendar, base[["Date", "ExchangeRate"]], on="Date", how="left")
    merged["ExchangeRate"] = merged["ExchangeRate"].ffill()

    # If the very first requested date is before the first available source date,
    # keep only dates from the first actual available observation onward.
    merged = merged.dropna(subset=["ExchangeRate"]).copy()

    merged["Date"] = merged["Date"].dt.date.astype(str)
    merged["RateType"] = rate_type
    merged["Source"] = source
    merged["LoadTimestampUTC"] = load_timestamp_utc

    return merged[["Date", "RateType", "ExchangeRate", "Source", "LoadTimestampUTC"]]
