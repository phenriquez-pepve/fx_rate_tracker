import Link from "next/link"
import { type CSSProperties, type ReactNode } from "react"
import {
  LayoutDashboard,
  LineChart,
  Table2,
  Info,
  TrendingUp,
} from "lucide-react"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/trends", label: "Tendencias", icon: LineChart },
  { href: "/detail", label: "Detalle", icon: Table2 },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/methodology", label: "Metodología", icon: Info },
]

type Props = {
  children: ReactNode
}

export function AppShell({ children }: Props) {
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm">
              PH
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                FX Rate Tracker
              </p>
              <p className="truncate text-xs text-slate-500">
                Venezuela
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">
              Espacio para logo corporativo
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Luego puedes reemplazar “PH” por tu logo real.
            </p>
          </div>
        </SidebarHeader>

        <Separator />

        <SidebarContent className="px-2 py-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton>
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 py-4">
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            Plataforma interna para monitoreo de tasa oficial y paralela.
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            {/* Header premium */}
            <div className="mb-5 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    title="Ver menú"
                    aria-label="Ver menú"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <SidebarTrigger />
                  </button>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Plataforma interna
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                      Monitor FX Venezuela
                    </h1>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Estado
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      Operativo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Fuente
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      DolarAPI + Dataset GitHub
                    </p>
                  </div>
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
