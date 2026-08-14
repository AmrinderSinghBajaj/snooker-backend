export default function UsageNote({ children }) {
  return (
    <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-gold/15 bg-gold/[0.04] px-4 py-3">
      <span className="mt-0.5 text-gold-light text-xs">↳</span>
      <p className="text-xs sm:text-[13px] text-smoke leading-relaxed">
        <span className="text-gold-light font-semibold">In practice — </span>
        {children}
      </p>
    </div>
  )
}
