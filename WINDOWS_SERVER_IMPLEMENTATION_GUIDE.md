# Guia de Implementacion en Windows Server

Esta guia esta pensada para el equipo de IT que recibira el proyecto como archivo ZIP y lo desplegara en un Windows Server.

## 1. Resumen de la Solucion

El proyecto tiene dos componentes:

- Pipeline de datos en Python: actualiza los archivos CSV en `data/`.
- Aplicacion web en Next.js: muestra el dashboard y lee `data/fx_rates_ves_usd_app_dataset.csv`.

Actualmente, las actualizaciones diarias se ejecutan con GitHub Actions:

- `08:30 UTC`: actualiza tasa oficial.
- `08:45 UTC`: actualiza tasa paralela.
- `09:00 UTC`: reconstruye el dataset usado por la app.

En Windows Server, esos GitHub Actions no se ejecutan localmente. Si se mantiene GitHub Actions activo, el servidor solo hospeda la app y consume el CSV publicado en GitHub. Si el servidor debe operar sin depender de GitHub Actions, IT debe configurar tareas programadas equivalentes.

## 2. Requisitos del Servidor

Instalar o validar:

- Windows Server con acceso administrativo.
- Python 3.12 o superior.
- Node.js LTS compatible con Next.js 16.
- npm incluido con Node.js.
- Git, solo si se usara repositorio Git o actualizacion/push de CSV.
- Acceso HTTPS saliente hacia:
  - `https://ve.dolarapi.com`
  - `https://raw.githubusercontent.com`, si la app seguira leyendo el dataset desde GitHub.

Puertos:

- La app Next.js usa `3000` por defecto.
- Si se publica por IIS, configurar reverse proxy hacia `http://localhost:3000`.

## 3. Preparar el Proyecto

1. Crear una carpeta de instalacion, por ejemplo:

```powershell
C:\Apps\fx_rate_tracker
```

2. Extraer el ZIP dentro de esa carpeta.

3. Abrir PowerShell como administrador y entrar al proyecto:

```powershell
cd C:\Apps\fx_rate_tracker
```

4. Crear y activar un entorno virtual de Python:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

5. Instalar dependencias de Python:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

6. Instalar dependencias de la app:

```powershell
cd C:\Apps\fx_rate_tracker\app
npm install
```

## 4. Validar el Pipeline de Datos

Ejecutar desde la raiz del proyecto:

```powershell
cd C:\Apps\fx_rate_tracker
.\.venv\Scripts\python.exe src\official_rate.py
.\.venv\Scripts\python.exe src\parallel_rate.py
.\.venv\Scripts\python.exe src\build_app_dataset.py
```

Validar que se actualicen estos archivos:

- `data\fx_official_ves_usd_history.csv`
- `data\fx_parallel_ves_usd_history.csv`
- `data\fx_rates_ves_usd_combined.csv`
- `data\fx_rates_ves_usd_app_dataset.csv`

Notas operativas:

- Si DolarAPI no ha publicado tasa para la fecha UTC actual, el script usa la ultima tasa almacenada y marca la fila como `(carried forward)`.
- Esto no es un error necesariamente. Significa que la app tiene una fila diaria, pero la fuente no publico un nuevo valor para esa fecha.

## 5. Construir y Ejecutar la Aplicacion

Desde la carpeta `app`:

```powershell
cd C:\Apps\fx_rate_tracker\app
npm run build
npm run start
```

La app deberia quedar disponible en:

```text
http://localhost:3000
```

Para acceso de usuarios, IT puede publicar esa URL mediante:

- IIS con URL Rewrite + Application Request Routing como reverse proxy.
- Un servicio Windows que ejecute `npm run start`.
- Una herramienta aprobada internamente para procesos Node.js, como PM2 o NSSM.

## 6. Comportamiento de Actualizacion Diaria

### Escenario A: Mantener GitHub Actions

Este es el escenario mas simple si el repositorio sigue disponible.

Funcionamiento:

1. GitHub Actions corre los jobs diarios en GitHub.
2. GitHub actualiza los CSV y hace push a `main`.
3. La app en Windows Server lee el CSV desde:

```text
https://raw.githubusercontent.com/phenriquez-pepve/fx_rate_tracker/refs/heads/main/data/fx_rates_ves_usd_app_dataset.csv
```

Ventajas:

- No hay que programar jobs de datos en Windows.
- El historico queda versionado automaticamente en GitHub.
- El servidor Windows solo hospeda la app.

Riesgos o dependencias:

- La app depende de acceso a GitHub raw content.
- Si el repositorio pasa a privado, esta lectura debe cambiar.
- La app puede tardar hasta 1 hora en reflejar cambios porque `fetchFxData` usa revalidacion de 3600 segundos.

### Escenario B: Ejecutar Todo en Windows Server

En este escenario, GitHub Actions deja de ser el scheduler principal. IT debe crear tareas programadas en Windows.

Crear tres tareas en Windows Task Scheduler:

| Tarea | Hora recomendada | Comando |
| --- | ---: | --- |
| FX Oficial | 08:30 UTC | `.\.venv\Scripts\python.exe src\official_rate.py` |
| FX Paralelo | 08:45 UTC | `.\.venv\Scripts\python.exe src\parallel_rate.py` |
| Build Dataset | 09:00 UTC | `.\.venv\Scripts\python.exe src\build_app_dataset.py` |

Configuracion importante de cada tarea:

- `Program/script`: `C:\Apps\fx_rate_tracker\.venv\Scripts\python.exe`
- `Start in`: `C:\Apps\fx_rate_tracker`
- Oficial `Add arguments`: `src\official_rate.py`
- Paralelo `Add arguments`: `src\parallel_rate.py`
- Dataset `Add arguments`: `src\build_app_dataset.py`
- Ejecutar con una cuenta de servicio.
- Marcar "Run whether user is logged on or not".
- Guardar salida y errores en logs mediante la configuracion operativa aprobada por IT.

Consideracion clave:

- La app actualmente lee el CSV desde GitHub raw, no desde el disco local del servidor.
- Si IT quiere que la app use el CSV generado localmente, se requiere un pequeno cambio de configuracion/codigo para servir `data\fx_rates_ves_usd_app_dataset.csv` por HTTP local o publicar el CSV en una ruta interna accesible.

### Escenario C: Windows Actualiza Datos y GitHub Sigue Publicando el CSV

En este escenario, Windows ejecuta los scripts y luego sube los CSV al repositorio.

Despues del build dataset, una tarea adicional podria ejecutar:

```powershell
git add data\fx_official_ves_usd_history.csv data\fx_parallel_ves_usd_history.csv data\fx_rates_ves_usd_combined.csv data\fx_rates_ves_usd_app_dataset.csv
git commit -m "Update FX datasets"
git push
```

Este escenario requiere:

- Git instalado.
- Credenciales de escritura al repositorio.
- Politica clara para manejar conflictos si alguien edita los CSV manualmente.

## 7. Publicacion con IIS como Reverse Proxy

Pasos de alto nivel:

1. Instalar IIS.
2. Instalar los modulos IIS URL Rewrite y Application Request Routing.
3. Habilitar proxy en Application Request Routing.
4. Crear un sitio o aplicacion IIS para el dashboard.
5. Configurar una regla de reverse proxy hacia:

```text
http://localhost:3000
```

6. Ejecutar la app Next.js como servicio Windows para que siempre este activa.

Ejemplo con NSSM, si esta aprobado por IT:

```powershell
nssm install FxRateTracker
```

Configurar:

- Application path: ruta a `npm.cmd`
- Startup directory: `C:\Apps\fx_rate_tracker\app`
- Arguments: `run start`

## 8. Validaciones Despues del Despliegue

Validar:

- La app abre correctamente desde la URL interna.
- La pagina `/data-quality` no muestra fechas duplicadas.
- `data\fx_rates_ves_usd_app_dataset.csv` tiene `DataFreshnessUTC` reciente.
- Las tareas programadas quedan en estado exitoso.
- El servidor tiene salida HTTPS a DolarAPI.
- Si se usa GitHub raw, el servidor tiene salida HTTPS a `raw.githubusercontent.com`.
- El dashboard muestra tasas actualizadas despues de la ventana diaria de ejecucion.

Comandos utiles:

```powershell
cd C:\Apps\fx_rate_tracker
.\.venv\Scripts\python.exe -m compileall src
cd C:\Apps\fx_rate_tracker\app
npm run build
```

## 9. Recomendacion Operativa

Para el primer despliegue interno, se recomienda:

1. Mantener GitHub Actions como mecanismo de actualizacion diaria.
2. Hospedar la app en Windows Server.
3. Confirmar que el servidor puede leer el CSV desde GitHub raw.
4. Usar Power Automate para la notificacion diaria con el link de la app.

Si por politica interna no se permite depender de GitHub raw content, el siguiente paso recomendado es ajustar la app para leer el dataset desde una URL interna administrada por IT.
