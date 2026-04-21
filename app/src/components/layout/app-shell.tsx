import Image from "next/image"
import { type CSSProperties, type ReactNode } from "react"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getLatestAvailableRow } from "@/lib/analytics/data-quality"
import { fetchFxData } from "@/lib/data/fetch-fx-data"
import { type FxAppRow } from "@/lib/data/types"
import { AppSidebarNav } from "@/components/layout/app-sidebar-nav"
import { APP_NAME } from "@/lib/constants"

type Props = {
  children: ReactNode
  rows?: FxAppRow[]
}

function formatRefreshDate(value: string | null) {
  if (!value) return "N/A"

  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  })
}

function formatRefreshDateTime(value: string | null) {
  if (!value) return "N/A"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `${date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  })} · ${date.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })} UTC`
}

export async function AppShell({ children, rows }: Props) {
  const shellRows = rows ?? (await fetchFxData())
  const latestOfficialRow = getLatestAvailableRow(shellRows, "OfficialRate", {
    publishedOnly: true,
  })

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-mobile": "18rem",
        } as CSSProperties
      }
    >
      <Sidebar variant="inset" collapsible="offcanvas">
        <SidebarHeader className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <Image
                src="/files/Image20240528143038.png"
                alt={`Logo ${APP_NAME}`}
                width={44}
                height={44}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {APP_NAME}
              </p>
              <p className="truncate text-xs text-slate-500">
                Venezuela
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">
              Desarrollo por Paul Henriquez
            </p>
            <p className="mt-1 text-xs text-slate-500">
              RGM Venezuela
            </p>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">
              Último refresh oficial
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatRefreshDateTime(latestOfficialRow?.DataFreshnessUTC ?? null)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fecha de tasa: {formatRefreshDate(latestOfficialRow?.Date ?? null)}
            </p>
          </div>
        </SidebarHeader>

        <Separator />

        <SidebarContent className="px-2 py-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <AppSidebarNav />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 py-4">
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            Venezuela: monitoreo de tasa oficial y paralela.
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-5 rounded-3xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4">
              <div className="flex flex-row items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    type="button"
                    title="Ver menú"
                    aria-label="Ver menú"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <SidebarTrigger />
                  </button>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Venezuela
                    </p>
                    <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">
                      {APP_NAME}
                    </h1>
                  </div>
                </div>

                <div className="flex shrink-0 justify-end p-[5px]">
                  <Image
                    src="/files/Image20240528142957.png"
                    alt="Logo Andean Revenue Management"
                    width={220}
                    height={106}
                    className="h-9 w-auto object-contain sm:h-12"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">{children}</div>

            <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
              Desarrollado por Paul Henriquez | RGM Venezuela
            </footer>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
