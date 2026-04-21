"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Info,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  Table2,
  TrendingUp,
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/trends", label: "Tendencias", icon: LineChart },
  { href: "/detail", label: "Detalle", icon: Table2 },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/methodology", label: "Metodología", icon: Info },
  { href: "/data-quality", label: "Calidad de datos", icon: ShieldCheck },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebarNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = isActiveRoute(pathname, item.href)

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              render={
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                />
              }
              isActive={isActive}
              className={cn(
                "h-10 gap-3 rounded-2xl px-3",
                isActive &&
                  "bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-900 hover:text-white data-active:bg-slate-900 data-active:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
