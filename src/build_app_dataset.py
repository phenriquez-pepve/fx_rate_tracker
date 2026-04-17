import pandas as pd
from pathlib import Path
from datetime import datetime, timezone


OFFICIAL_PATH = "data/fx_official_ves_usd_history.csv"
PARALLEL_PATH = "data/fx_parallel_ves_usd_history.csv"
COMBINED_LONG_PATH = "data/fx_rates_ves_usd_combined.csv"
APP_DATASET_PATH = "data/fx_rates_ves_usd_app_dataset.csv"


def load_csv(path: str) -> pd.DataFrame:
    p = Path(path)
    if not p.exists():
        return pd.DataFrame()
    return pd.read_csv(p)


def add_carried_forward_flag(df: pd.DataFrame, new_flag_column: str) -> pd.DataFrame:
    df = df.copy()

    if "Source" not in df.columns:
        df[new_flag_column] = False
        return df

    df[new_flag_column] = (
        df["Source"]
        .fillna("")
        .astype(str)
        .str.lower()
        .str.contains("carried forward", regex=False)
    )

    return df


def main():
    official = load_csv(OFFICIAL_PATH)
    parallel = load_csv(PARALLEL_PATH)

    if official.empty:
        raise ValueError("Official FX history file is empty or missing.")

    if not official.empty:
        official["Date"] = pd.to_datetime(official["Date"]).dt.date.astype(str)
        official["ExchangeRate"] = pd.to_numeric(official["ExchangeRate"], errors="coerce")
        official = official.dropna(subset=["ExchangeRate"]).copy()
        official = add_carried_forward_flag(official, "OfficialCarriedForward")

    if not parallel.empty:
        parallel["Date"] = pd.to_datetime(parallel["Date"]).dt.date.astype(str)
        parallel["ExchangeRate"] = pd.to_numeric(parallel["ExchangeRate"], errors="coerce")
        parallel = parallel.dropna(subset=["ExchangeRate"]).copy()
        parallel = add_carried_forward_flag(parallel, "ParallelCarriedForward")

    # -----------------------------
    # Long combined dataset
    # -----------------------------
    combined = pd.concat([official, parallel], ignore_index=True)
    combined = combined.sort_values(["Date", "RateType"]).reset_index(drop=True)

    Path(COMBINED_LONG_PATH).parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(COMBINED_LONG_PATH, index=False)

    # -----------------------------
    # Wide app dataset
    # -----------------------------
    official_w = official[["Date", "ExchangeRate", "OfficialCarriedForward"]].copy()
    official_w = official_w.rename(columns={"ExchangeRate": "OfficialRate"})

    if parallel.empty:
        app_df = official_w.copy()
        app_df["ParallelRate"] = pd.NA
        app_df["ParallelCarriedForward"] = pd.NA
    else:
        parallel_w = parallel[["Date", "ExchangeRate", "ParallelCarriedForward"]].copy()
        parallel_w = parallel_w.rename(columns={"ExchangeRate": "ParallelRate"})

        app_df = pd.merge(official_w, parallel_w, on="Date", how="outer")

    app_df["Date"] = pd.to_datetime(app_df["Date"]).dt.date.astype(str)

    app_df["OfficialRate"] = pd.to_numeric(app_df["OfficialRate"], errors="coerce")
    app_df["ParallelRate"] = pd.to_numeric(app_df["ParallelRate"], errors="coerce")

    app_df["GapAbs"] = app_df["ParallelRate"] - app_df["OfficialRate"]
    app_df["GapPct"] = (app_df["ParallelRate"] - app_df["OfficialRate"]) / app_df["OfficialRate"]

    app_df["DataFreshnessUTC"] = datetime.now(timezone.utc).isoformat()

    desired_columns = [
        "Date",
        "OfficialRate",
        "OfficialCarriedForward",
        "ParallelRate",
        "ParallelCarriedForward",
        "GapAbs",
        "GapPct",
        "DataFreshnessUTC",
    ]

    for col in desired_columns:
        if col not in app_df.columns:
            app_df[col] = pd.NA

    app_df = app_df[desired_columns]
    app_df = app_df.sort_values("Date").reset_index(drop=True)

    app_df.to_csv(APP_DATASET_PATH, index=False)

    print(f"Built {COMBINED_LONG_PATH} with {len(combined)} rows")
    print(f"Built {APP_DATASET_PATH} with {len(app_df)} rows")


if __name__ == "__main__":
    main()
