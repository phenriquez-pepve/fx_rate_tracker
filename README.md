# FX Rate Tracker

Internal MVP for tracking the Venezuela VES/USD official and parallel exchange rates. The repository contains two main parts:

- Python data jobs that collect, normalize, and publish CSV datasets.
- A Next.js dashboard app that reads the published dataset and exposes summary, trend, detail, forecast, methodology, and data-quality views.

## Repository Map

```text
.
├── .github/workflows/              # Scheduled and manual GitHub Actions jobs
├── data/                           # Versioned CSV datasets consumed by the app
├── src/                            # Python data pipeline scripts
├── requirements.txt                # Python pipeline dependencies
└── app/                            # Next.js dashboard application
    ├── public/                     # Logos, icons, and static assets
    └── src/
        ├── app/                    # App Router pages
        ├── components/             # UI, charts, dashboards, and layout
        └── lib/                    # Data loading, analytics, formatting, utilities
```

## Data Flow

1. `src/official_rate.py` fetches the current official rate from DolarAPI.
2. `src/parallel_rate.py` fetches the current parallel rate from DolarAPI.
3. Both scripts upsert one calendar-daily row into their respective history CSV.
4. If the API has not published a new value for the current UTC date, the script carries forward the latest stored rate and marks the source as carried forward.
5. `src/build_app_dataset.py` combines the official and parallel histories into:
   - `data/fx_rates_ves_usd_combined.csv`: long-format dataset.
   - `data/fx_rates_ves_usd_app_dataset.csv`: wide-format app dataset.
6. The Next.js app fetches the wide dataset from GitHub raw content using `APP_DATASET_URL` in `app/src/lib/constants.ts`.

## Data Files

### `data/fx_official_ves_usd_history.csv`

Official-rate history with these columns:

- `Date`: calendar date in `YYYY-MM-DD`.
- `RateType`: `Official FX`.
- `ExchangeRate`: VES/USD rate.
- `Source`: source label, including carry-forward status when applicable.
- `LoadTimestampUTC`: job execution timestamp.

### `data/fx_parallel_ves_usd_history.csv`

Parallel-rate history with the same schema as the official file.

### `data/fx_rates_ves_usd_combined.csv`

Long-format combined dataset created by concatenating the official and parallel histories.

### `data/fx_rates_ves_usd_app_dataset.csv`

Wide-format dataset consumed by the dashboard:

- `Date`
- `OfficialRate`
- `OfficialCarriedForward`
- `ParallelRate`
- `ParallelCarriedForward`
- `GapAbs`: `ParallelRate - OfficialRate`
- `GapPct`: `(ParallelRate - OfficialRate) / OfficialRate`
- `DataFreshnessUTC`

## Scheduled Jobs

All GitHub Actions cron schedules run in UTC.

| Workflow | Schedule | Purpose |
| --- | ---: | --- |
| `daily-official-rate.yml` | `08:30 UTC` | Updates official-rate history |
| `daily-parallel-rate.yml` | `08:45 UTC` | Updates parallel-rate history |
| `build-app-dataset.yml` | `09:00 UTC` | Builds the combined and app datasets |
| `backfill-official-rate.yml` | Manual | Rebuilds official history from historical API |
| `backfill-parallel-rate.yml` | Manual | Rebuilds parallel history from historical API |

The daily dataset build should run after both daily rate jobs have completed and pushed their CSV updates. If one upstream job fails, manually inspect the Actions tab before trusting the latest app dataset.

## Local Setup

### Python Data Pipeline

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Run individual jobs:

```bash
python src/official_rate.py
python src/parallel_rate.py
python src/build_app_dataset.py
```

Run historical backfills:

```bash
python src/backfill_official.py
python src/backfill_parallel.py
python src/build_app_dataset.py
```

### Next.js App

```bash
cd app
npm install
npm run dev
```

Open the local server URL shown by Next.js, usually `http://localhost:3000`.

Production validation:

```bash
cd app
npm run lint
npm run build
```

## App Pages

- `/`: executive summary with latest rate, MTD, YTD, interannual, and gap KPIs.
- `/trends`: date-filterable official/parallel rate charts and gap trend chart.
- `/detail`: date-filterable table with CSV export.
- `/forecast`: descriptive 30-day forecast with regular, optimistic, and pessimistic scenarios.
- `/methodology`: user-facing description of sources and calculation rules.
- `/data-quality`: operational checks for coverage, duplicates, freshness, and carry-forward behavior.

## Forecast Methodology

The forecast is descriptive, not predictive guidance.

Core behavior:

- Uses the latest available official and parallel rates as anchors.
- Computes observed daily devaluation only from published observations, excluding carry-forward rows.
- Normalizes returns by elapsed days between published observations.
- Uses weighted windows of 7, 14, 30, and 90 days.
- Regular scenario uses the weighted average daily devaluation.
- Optimistic and pessimistic scenarios adjust the regular base by `0.75` weighted standard deviations.
- Forecast horizon defaults to 30 days in `ForecastDashboard`.
- Gap is derived from projected official and parallel rates; it is not independently forecasted.

Points of attention:

- Forecast quality depends entirely on source-history quality.
- Very short parallel history can make parallel forecast windows sparse.
- Carry-forward rows are useful for app continuity but intentionally excluded from forecast return calculations.
- Scenario labels should be read as sensitivity cases, not confidence intervals.

## Carry-Forward Logic

Carry-forward exists to keep a calendar-daily dataset even when a source has not published a new value.

Important behavior:

- Current daily jobs compare the source publication date to the current UTC date.
- If the dates differ, the latest stored value is reused for today's row.
- The `Source` column includes `(carried forward)`.
- `build_app_dataset.py` converts that source label into `OfficialCarriedForward` and `ParallelCarriedForward`.

Operational implication:

- A carried-forward row means the app is updated, but the underlying rate was not newly published by the source for that date.

## External Dependencies

Data source:

- DolarAPI official current and historical endpoints.
- DolarAPI parallel current and historical endpoints.

App runtime:

- Next.js App Router.
- Recharts for charts.
- shadcn/base-ui components for UI primitives.
- Vercel Analytics.

## Deployment Notes

The app fetches the CSV from the repository's `main` branch:

```ts
APP_DATASET_URL =
  "https://raw.githubusercontent.com/phenriquez-pepve/fx_rate_tracker/refs/heads/main/data/fx_rates_ves_usd_app_dataset.csv"
```

This keeps deployment simple, but it means:

- The deployed app depends on GitHub raw content availability.
- The app may show data up to one hour stale because `fetchFxData` uses `revalidate: 3600`.
- If the repository or branch name changes, update `APP_DATASET_URL`.
- If the app moves to a private repository, raw GitHub fetching will need to be replaced with another data-hosting approach.

## Power Automate Notification

Email notification is intentionally not implemented in this repository. For the internal MVP, daily notification should live in Microsoft Power Automate inside the company Microsoft environment.

Suggested trigger:

- Scheduled cloud flow.
- Run daily at 9:00 AM Caracas time.
- Send a clean internal email with the app link after the expected dataset refresh window.

## Code Organization Notes

- `app/src/lib/data` owns CSV fetching and parsing.
- `app/src/lib/analytics` owns reusable calculations.
- `app/src/lib/date-ranges.ts` owns shared date preset behavior for the trends and detail views.
- Dashboard components should stay focused on UI state and presentation.
- Python scripts should remain small, single-purpose jobs suitable for GitHub Actions.

## Maintenance Checklist

Before an internal release:

```bash
python -m compileall src
cd app
npm run lint
npm run build
```

Also check:

- GitHub Actions completed successfully for official, parallel, and app dataset jobs.
- `data/fx_rates_ves_usd_app_dataset.csv` has a recent `DataFreshnessUTC`.
- `/data-quality` shows zero duplicate dates.
- Carry-forward counts are explainable by weekends, holidays, or source publishing delays.
- Forecast copy still matches the active windows in `app/src/lib/analytics/forecast.ts`.

## Known MVP Tradeoffs

- CSV parsing in the app is intentionally simple because the generated dataset does not contain quoted comma-heavy fields.
- The app reads from GitHub raw CSV rather than a database.
- GitHub Actions commit generated datasets back into the repository; this is simple and auditable, but can create commit noise.
- No authentication is implemented in the app layer. Access control should be handled by deployment/environment controls for the internal launch.
- No email system is included in code; Microsoft Power Automate owns internal notifications.

## Troubleshooting

### Dataset did not update

Check GitHub Actions in this order:

1. `Daily Official FX`
2. `Daily Parallel FX`
3. `Build App Dataset`

If a rate job failed, rerun it manually, then rerun `Build App Dataset`.

### App shows old data

- Confirm the app dataset CSV changed on `main`.
- Wait for the one-hour app revalidation window, or redeploy/revalidate depending on hosting setup.
- Check `APP_DATASET_URL` if the repository, branch, or file path changed.

### Parallel values are blank in early history

This is expected for dates before the parallel historical series begins.

### Forecast looks too flat or too aggressive

Review:

- Carry-forward flags.
- Available observed rows in the 7/14/30/90 day windows.
- Recent source discontinuities or outliers.
- Whether the latest source data was actually published or carried forward.
