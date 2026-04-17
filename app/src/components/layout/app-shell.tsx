import Link from "next/link"
import { ReactNode } from "react"
import {
  LayoutDashboard,
  LineChart,
  Table2,
  Info,
  Scale,
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
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/trends", label: "Tendencias", icon: LineChart },
  { href: "/comparisons", label: "Comparaciones", icon: Scale },
  { href: "/detail", label: "Detalle", icon: Table2 },
  { href: "/methodology", label: "Metodología", icon: Info },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-mobile": "18rem",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
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
          <p className="mt-3 text-xs text-slate-400">
            Aquí luego puedes reemplazar el bloque “PH” por tu logo.
          </p>
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
            {children}

            <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
              Desarrollado por Paul Henriquez | RGM Venezuela
            </footer>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}