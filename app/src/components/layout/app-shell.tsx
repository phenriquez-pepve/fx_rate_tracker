import Link from "next/link"
import { ReactNode } from "react"

const navItems = [
  { href: "/", label: "Summary" },
  { href: "/trends", label: "Trends" },
  { href: "/comparisons", label: "Comparisons" },
  { href: "/detail", label: "Detail" },
  { href: "/methodology", label: "Methodology" },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">
            Venezuela FX Rate Tracker
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Official and Parallel USD/VES monitoring for internal business use.
          </p>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  )
}
