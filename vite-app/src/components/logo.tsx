export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="47"
        rx="12.5"
        fill="#141416"
        stroke="rgba(255,255,255,0.14)"
      />
      <path d="M9 30h30" stroke="#ffffff" strokeOpacity="0.24" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M33 9v30" stroke="#ffffff" strokeOpacity="0.24" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 30 33 14" stroke="#f5a524" strokeWidth="3.8" strokeLinecap="round" />
      <circle cx="17" cy="30" r="2.6" fill="#f5a524" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-medium">Side</span> <span className="font-bold">Streets</span>
    </span>
  )
}
