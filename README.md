# Rastreador de Tipo de Cambio

MVP interno para dar seguimiento a los tipos de cambio VES/USD oficial y paralelo de Venezuela. El repositorio contiene dos partes principales:

- Jobs de datos en Python que recopilan, normalizan y publican datasets CSV.
- Una aplicacion de dashboard en Next.js que lee el dataset publicado y muestra vistas de resumen, tendencias, detalle, pronostico, metodologia y calidad de datos.

## Mapa del Repositorio

```text
.
├── .github/workflows/              # Jobs programados y manuales de GitHub Actions
├── data/                           # Datasets CSV versionados consumidos por la app
├── src/                            # Scripts del pipeline de datos en Python
├── requirements.txt                # Dependencias del pipeline de Python
└── app/                            # Aplicacion dashboard en Next.js
    ├── public/                     # Logos, iconos y activos estaticos
    └── src/
        ├── app/                    # Paginas con App Router
        ├── components/             # UI, graficos, dashboards y layout
        └── lib/                    # Carga de datos, analitica, formato y utilidades
```

## Flujo de Datos

1. `src/official_rate.py` obtiene la tasa oficial actual desde DolarAPI.
2. `src/parallel_rate.py` obtiene la tasa paralela actual desde DolarAPI.
3. Ambos scripts insertan o actualizan una fila diaria calendario en su respectivo CSV historico.
4. Si la API no ha publicado un nuevo valor para la fecha UTC actual, el script reutiliza la ultima tasa almacenada y marca la fuente como arrastrada del dia anterior.
5. `src/build_app_dataset.py` combina los historicos oficial y paralelo en:
   - `data/fx_rates_ves_usd_combined.csv`: dataset en formato largo.
   - `data/fx_rates_ves_usd_app_dataset.csv`: dataset en formato ancho usado por la aplicacion.
6. La aplicacion Next.js obtiene el dataset ancho desde el contenido raw de GitHub usando `APP_DATASET_URL` en `app/src/lib/constants.ts`.

## Archivos de Datos

### `data/fx_official_ves_usd_history.csv`

Historico de la tasa oficial con estas columnas:

- `Date`: fecha calendario en formato `YYYY-MM-DD`.
- `RateType`: `Official FX`.
- `ExchangeRate`: tasa VES/USD.
- `Source`: etiqueta de la fuente, incluyendo estado de arrastre cuando aplique.
- `LoadTimestampUTC`: timestamp UTC de ejecucion del job.

### `data/fx_parallel_ves_usd_history.csv`

Historico de la tasa paralela con el mismo esquema del archivo oficial.

### `data/fx_rates_ves_usd_combined.csv`

Dataset combinado en formato largo, creado al concatenar los historicos oficial y paralelo.

### `data/fx_rates_ves_usd_app_dataset.csv`

Dataset en formato ancho consumido por el dashboard:

- `Date`
- `OfficialRate`
- `OfficialCarriedForward`
- `ParallelRate`
- `ParallelCarriedForward`
- `GapAbs`: `ParallelRate - OfficialRate`
- `GapPct`: `(ParallelRate - OfficialRate) / OfficialRate`
- `DataFreshnessUTC`

## Jobs Programados

Todos los cron schedules de GitHub Actions se ejecutan en UTC.

| Workflow | Horario | Proposito |
| --- | ---: | --- |
| `daily-official-rate.yml` | `08:30 UTC` | Actualiza el historico de tasa oficial |
| `daily-parallel-rate.yml` | `08:45 UTC` | Actualiza el historico de tasa paralela |
| `build-app-dataset.yml` | `09:00 UTC` | Construye los datasets combinado y de aplicacion |
| `backfill-official-rate.yml` | Manual | Reconstruye el historico oficial desde la API historica |
| `backfill-parallel-rate.yml` | Manual | Reconstruye el historico paralelo desde la API historica |

El build diario del dataset debe ejecutarse despues de que ambos jobs diarios de tasas hayan terminado y hayan subido sus cambios de CSV. Si uno de los jobs anteriores falla, se debe revisar manualmente la pestana Actions antes de confiar en el ultimo dataset de la aplicacion.

## Ejecucion en Windows Server

Los GitHub Actions no se ejecutan dentro del Windows Server. Se ejecutan en la infraestructura de GitHub, actualizan los CSV del repositorio y hacen `git push` a la rama `main`.

Si la aplicacion desplegada en Windows Server conserva el `APP_DATASET_URL` actual, seguira leyendo el CSV desde GitHub raw. En ese escenario, las actualizaciones diarias seguiran funcionando aunque la aplicacion este hospedada en Windows, siempre que:

- El repositorio siga disponible para la aplicacion.
- El servidor tenga salida HTTPS hacia `raw.githubusercontent.com`.
- Los workflows de GitHub Actions sigan habilitados.

Si el proyecto se entrega como ZIP y no se mantendra conectado a GitHub Actions, entonces las actualizaciones automaticas no ocurriran por si solas. En ese caso hay que reemplazar GitHub Actions con una alternativa operativa:

- Opcion recomendada si se permite GitHub: mantener GitHub Actions como motor de actualizacion y desplegar la app en Windows solo como consumidor del dataset.
- Opcion recomendada si todo debe vivir en Windows: crear tareas programadas de Windows Task Scheduler que ejecuten `python src/official_rate.py`, `python src/parallel_rate.py` y `python src/build_app_dataset.py` en el orden correcto. Luego la app debe leer el CSV local o se debe publicar el CSV generado en una ubicacion accesible por HTTP.
- Opcion hibrida: ejecutar las tareas en Windows y hacer `git commit`/`git push` de los CSV para mantener el repositorio como fuente de datos.
- Opcion empresarial: mover los jobs de Python a un scheduler interno, como Windows Task Scheduler, SQL Agent, Azure Automation, Jenkins, Control-M u otra herramienta aprobada por IT.

Ver [WINDOWS_SERVER_IMPLEMENTATION_GUIDE.md](WINDOWS_SERVER_IMPLEMENTATION_GUIDE.md) para una guia paso a paso de despliegue.

## Configuracion Local

### Pipeline de Datos en Python

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Ejecutar jobs individuales:

```bash
python src/official_rate.py
python src/parallel_rate.py
python src/build_app_dataset.py
```

Ejecutar backfills historicos:

```bash
python src/backfill_official.py
python src/backfill_parallel.py
python src/build_app_dataset.py
```

### Aplicacion Next.js

```bash
cd app
npm install
npm run dev
```

Abrir la URL local mostrada por Next.js, normalmente `http://localhost:3000`.

Validacion de produccion:

```bash
cd app
npm run lint
npm run build
```

## Paginas de la Aplicacion

- `/`: resumen ejecutivo con tasa mas reciente, KPIs MTD, YTD, interanual y brecha.
- `/trends`: graficos filtrables por fecha de tasas oficial/paralela y tendencia de brecha.
- `/detail`: tabla filtrable por fecha con exportacion CSV.
- `/forecast`: pronostico descriptivo a 30 dias con escenarios regular, optimista y pesimista.
- `/methodology`: descripcion para usuarios sobre fuentes y reglas de calculo.
- `/data-quality`: controles operativos de cobertura, duplicados, frescura y comportamiento de arrastre.

## Metodologia del Pronostico

El pronostico es descriptivo, no una recomendacion predictiva.

Comportamiento principal:

- Usa las ultimas tasas oficial y paralela disponibles como puntos de anclaje.
- Calcula la devaluacion diaria observada solo desde observaciones publicadas, excluyendo filas arrastradas.
- Normaliza retornos por dias transcurridos entre observaciones publicadas.
- Usa ventanas ponderadas de 7, 14, 30 y 90 dias.
- El escenario regular usa el promedio ponderado de devaluacion diaria.
- Los escenarios optimista y pesimista ajustan la base regular por `0.75` desviaciones estandar ponderadas.
- El horizonte del pronostico por defecto es de 30 dias en `ForecastDashboard`.
- La brecha se deriva de las tasas oficial y paralela proyectadas; no se pronostica de forma independiente.

Puntos de atencion:

- La calidad del pronostico depende completamente de la calidad del historico de fuentes.
- Un historico paralelo muy corto puede hacer que las ventanas de pronostico paralelo sean escasas.
- Las filas arrastradas son utiles para continuidad de la app, pero se excluyen intencionalmente de los calculos de retorno del pronostico.
- Las etiquetas de escenario deben leerse como casos de sensibilidad, no como intervalos de confianza.

## Logica de Arrastre

La logica de arrastre existe para mantener un dataset diario calendario incluso cuando una fuente no ha publicado un valor nuevo.

Comportamiento importante:

- Los jobs diarios actuales comparan la fecha de publicacion de la fuente con la fecha UTC actual.
- Si las fechas difieren, se reutiliza el ultimo valor almacenado para la fila de hoy.
- La columna `Source` incluye `(carried forward)`.
- `build_app_dataset.py` convierte esa etiqueta en `OfficialCarriedForward` y `ParallelCarriedForward`.

Implicacion operativa:

- Una fila arrastrada significa que la app fue actualizada, pero la tasa subyacente no fue publicada nuevamente por la fuente para esa fecha.

## Dependencias Externas

Fuente de datos:

- Endpoints actuales e historicos de DolarAPI para tasa oficial.
- Endpoints actuales e historicos de DolarAPI para tasa paralela.

Runtime de la aplicacion:

- Next.js App Router.
- Recharts para graficos.
- Componentes shadcn/base-ui como primitivas de UI.
- Vercel Analytics.

## Tecnologias, Versiones y Herramientas

### Runtime y Lenguajes

| Tecnologia | Version / Configuracion | Uso |
| --- | --- | --- |
| Python | `3.12` en GitHub Actions | Jobs de extraccion, normalizacion y generacion de CSV |
| Node.js | Recomendado: version LTS compatible con Next.js 16 | Runtime y build de la aplicacion web |
| TypeScript | `^5` | Desarrollo tipado del frontend |
| JavaScript / TSX | React JSX con `jsx: react-jsx` | Componentes de UI y paginas |

### Frontend

| Tecnologia | Version | Uso |
| --- | ---: | --- |
| Next.js | `16.2.4` | Framework web con App Router |
| React | `19.2.4` | Libreria principal de UI |
| React DOM | `19.2.4` | Renderizado web de React |
| Tailwind CSS | `^4` | Sistema de estilos utilitarios |
| `@tailwindcss/postcss` | `^4` | Integracion PostCSS para Tailwind |
| Recharts | `^3.8.1` | Graficos de tasas, brechas y tendencias |
| Framer Motion | `^12.38.0` | Animaciones e interacciones |
| Lucide React | `^1.8.0` | Iconografia |
| shadcn | `^4.3.0` | Generacion y convenciones de componentes UI |
| `@base-ui/react` | `^1.4.0` | Primitivas accesibles de interfaz |
| `@tanstack/react-table` | `^8.21.3` | Tabla de detalle y manejo tabular |
| `class-variance-authority` | `^0.7.1` | Variantes de componentes |
| `clsx` | `^2.1.1` | Composicion condicional de clases CSS |
| `tailwind-merge` | `^3.5.0` | Resolucion de clases Tailwind |
| `tw-animate-css` | `^1.4.0` | Utilidades de animacion CSS |
| `@vercel/analytics` | `^2.0.1` | Analitica de Vercel |

### Pipeline de Datos

| Tecnologia | Version | Uso |
| --- | ---: | --- |
| pandas | `2.2.3` | Lectura, transformacion, union y escritura de datasets CSV |
| requests | `2.32.3` | Consumo HTTP de DolarAPI |
| CSV | N/A | Persistencia versionada de historicos y dataset de aplicacion |

### Calidad, Build y Configuracion

| Herramienta | Version / Configuracion | Uso |
| --- | --- | --- |
| ESLint | `^9` | Linting del frontend |
| `eslint-config-next` | `16.2.4` | Reglas Next.js Core Web Vitals y TypeScript |
| TypeScript strict mode | `strict: true` | Validacion estatica estricta |
| Next Turbopack | Configurado por Next.js | Build/dev server de la app |
| PostCSS | Via `@tailwindcss/postcss` | Procesamiento CSS |
| shadcn config | `base-luma`, `neutral`, iconos `lucide` | Convenciones visuales y aliases de UI |

### Automatizacion y Despliegue

| Herramienta | Version / Configuracion | Uso |
| --- | --- | --- |
| GitHub Actions | `ubuntu-latest` | Scheduler de jobs diarios y manuales |
| `actions/checkout` | `v4` | Checkout del repositorio en workflows |
| `actions/setup-python` | `v5`, Python `3.12` | Preparacion del runtime Python en workflows |
| Git | N/A | Commit y push automatico de CSV generados |
| Windows Task Scheduler | Alternativa de despliegue Windows | Scheduler local si no se usa GitHub Actions |
| IIS + reverse proxy | Alternativa de publicacion Windows | Publicacion interna de la app Next.js |

### Fuentes y Servicios Externos

| Servicio | Uso |
| --- | --- |
| DolarAPI | Fuente de tasa oficial y paralela VES/USD |
| GitHub raw content | Hosting actual del CSV consumido por la app |
| Vercel Analytics | Analitica de uso de la aplicacion |

## Notas de Despliegue

La aplicacion obtiene el CSV desde la rama `main` del repositorio:

```ts
APP_DATASET_URL =
  "https://raw.githubusercontent.com/phenriquez-pepve/fx_rate_tracker/refs/heads/main/data/fx_rates_ves_usd_app_dataset.csv"
```

Esto simplifica el despliegue, pero implica que:

- La aplicacion desplegada depende de la disponibilidad de GitHub raw content.
- La aplicacion puede mostrar datos con hasta una hora de desfase porque `fetchFxData` usa `revalidate: 3600`.
- Si cambia el nombre del repositorio o de la rama, hay que actualizar `APP_DATASET_URL`.
- Si la aplicacion se mueve a un repositorio privado, la lectura desde GitHub raw tendra que reemplazarse por otra forma de hospedaje de datos.

## Notificacion con Power Automate

La notificacion por correo no esta implementada intencionalmente en este repositorio. Para el MVP interno, la notificacion diaria deberia vivir en Microsoft Power Automate dentro del entorno Microsoft de la compania.

Trigger sugerido:

- Flujo cloud programado.
- Ejecutar diariamente a las 9:00 AM hora de Caracas.
- Enviar un correo interno limpio con el enlace de la aplicacion despues de la ventana esperada de actualizacion del dataset.

## Notas de Organizacion del Codigo

- `app/src/lib/data` contiene la carga y parseo del CSV.
- `app/src/lib/analytics` contiene calculos reutilizables.
- `app/src/lib/date-ranges.ts` contiene el comportamiento compartido de presets de fecha para las vistas de tendencias y detalle.
- Los componentes de dashboard deben mantenerse enfocados en estado de UI y presentacion.
- Los scripts de Python deben permanecer pequenos, con una sola responsabilidad, y aptos para GitHub Actions.

## Checklist de Mantenimiento

Antes de una publicacion interna:

```bash
python -m compileall src
cd app
npm run lint
npm run build
```

Tambien revisar:

- GitHub Actions completo exitosamente los jobs oficial, paralelo y dataset de aplicacion.
- `data/fx_rates_ves_usd_app_dataset.csv` tiene un `DataFreshnessUTC` reciente.
- `/data-quality` muestra cero fechas duplicadas.
- Los conteos de arrastre se pueden explicar por fines de semana, feriados o retrasos de publicacion de la fuente.
- El texto de pronostico sigue alineado con las ventanas activas en `app/src/lib/analytics/forecast.ts`.

## Tradeoffs Conocidos del MVP

- El parseo de CSV en la aplicacion es intencionalmente simple porque el dataset generado no contiene campos con comas complejas entre comillas.

---

## English Version

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

## Technologies, Versions, and Tools

### Runtime and Languages

| Technology | Version / Configuration | Use |
| --- | --- | --- |
| Python | `3.12` in GitHub Actions | Data extraction, normalization, and CSV generation jobs |
| Node.js | Recommended: LTS version compatible with Next.js 16 | Web app runtime and build |
| TypeScript | `^5` | Typed frontend development |
| JavaScript / TSX | React JSX with `jsx: react-jsx` | UI components and pages |

### Frontend

| Technology | Version | Use |
| --- | ---: | --- |
| Next.js | `16.2.4` | Web framework with App Router |
| React | `19.2.4` | Main UI library |
| React DOM | `19.2.4` | React web rendering |
| Tailwind CSS | `^4` | Utility-first styling system |
| `@tailwindcss/postcss` | `^4` | Tailwind PostCSS integration |
| Recharts | `^3.8.1` | Rate, gap, and trend charts |
| Framer Motion | `^12.38.0` | Animations and interactions |
| Lucide React | `^1.8.0` | Icons |
| shadcn | `^4.3.0` | UI component generation and conventions |
| `@base-ui/react` | `^1.4.0` | Accessible UI primitives |
| `@tanstack/react-table` | `^8.21.3` | Detail table and tabular behavior |
| `class-variance-authority` | `^0.7.1` | Component variants |
| `clsx` | `^2.1.1` | Conditional CSS class composition |
| `tailwind-merge` | `^3.5.0` | Tailwind class conflict resolution |
| `tw-animate-css` | `^1.4.0` | CSS animation utilities |
| `@vercel/analytics` | `^2.0.1` | Vercel Analytics |

### Data Pipeline

| Technology | Version | Use |
| --- | ---: | --- |
| pandas | `2.2.3` | Reading, transforming, joining, and writing CSV datasets |
| requests | `2.32.3` | HTTP calls to DolarAPI |
| CSV | N/A | Versioned persistence for histories and app dataset |

### Quality, Build, and Configuration

| Tool | Version / Configuration | Use |
| --- | --- | --- |
| ESLint | `^9` | Frontend linting |
| `eslint-config-next` | `16.2.4` | Next.js Core Web Vitals and TypeScript rules |
| TypeScript strict mode | `strict: true` | Strict static validation |
| Next Turbopack | Configured by Next.js | App build/dev server |
| PostCSS | Via `@tailwindcss/postcss` | CSS processing |
| shadcn config | `base-luma`, `neutral`, `lucide` icons | Visual conventions and UI aliases |

### Automation and Deployment

| Tool | Version / Configuration | Use |
| --- | --- | --- |
| GitHub Actions | `ubuntu-latest` | Scheduled and manual jobs |
| `actions/checkout` | `v4` | Repository checkout in workflows |
| `actions/setup-python` | `v5`, Python `3.12` | Python runtime setup in workflows |
| Git | N/A | Automatic commit and push of generated CSV files |
| Windows Task Scheduler | Windows deployment alternative | Local scheduler if GitHub Actions is not used |
| IIS + reverse proxy | Windows publishing alternative | Internal publishing for the Next.js app |

### External Sources and Services

| Service | Use |
| --- | --- |
| DolarAPI | Official and parallel VES/USD exchange-rate source |
| GitHub raw content | Current hosting for the CSV consumed by the app |
| Vercel Analytics | App usage analytics |

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
