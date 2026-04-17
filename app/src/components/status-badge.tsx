type Props = {
  active?: boolean | null
  trueLabel?: string
  falseLabel?: string
}

export function StatusBadge({
  active,
  trueLabel = "Yes",
  falseLabel = "No",
}: Props) {
  if (active == null) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
        N/A
      </span>
    )
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
        active
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {active ? trueLabel : falseLabel}
    </span>
  )
}
