// Minimal inline stroke icons — no external icon library dependency.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const IconTable = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="6" width="19" height="11" rx="1.5" />
    <circle cx="7" cy="11.5" r="1.1" />
    <circle cx="12" cy="11.5" r="1.1" />
    <circle cx="17" cy="11.5" r="1.1" />
    <path d="M6 17v2M18 17v2" />
  </svg>
)

export const IconSplit = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 6h5l6 12h5" />
    <path d="M4 18h5l1.5-3" />
    <path d="M16 4l4 2-4 2M16 16l4 2-4 2" />
  </svg>
)

export const IconChart = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)

export const IconCup = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M5 4h11v8a5.5 5.5 0 0 1-11 0V4Z" />
    <path d="M16 7h2a2.5 2.5 0 0 1 0 5h-2" />
    <path d="M6 20h9" />
  </svg>
)

export const IconMembership = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="5" width="19" height="13" rx="2" />
    <circle cx="8" cy="11.5" r="2" />
    <path d="M13.5 9.5h5M13.5 13.5h3" />
  </svg>
)

export const IconUsers = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17.5" cy="9" r="2.3" />
    <path d="M15.5 20c.2-2.6 2-4.7 4.5-5.4" />
  </svg>
)

export const IconBuilding = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
    <path d="M14 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12" />
    <path d="M2 21h20M7 8h1M7 12h1M7 16h1M17 12h1M17 16h1" />
  </svg>
)

export const IconClock = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
)

export const IconLock = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

export const IconWhatsapp = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8.9 19L4 20Z" />
    <path d="M8.5 9.5c.2 2.6 2.4 4.8 5 5" />
  </svg>
)

export const IconTv = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
    <path d="M8 21h8M12 17v4" />
  </svg>
)

export const IconWallet = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <path d="M16 12h3M3 9h18" />
  </svg>
)

export const IconFilm = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="4" width="19" height="16" rx="2" />
    <path d="M2.5 9h19M2.5 15h19M8 4v16M16 4v16" />
  </svg>
)

export const IconSparkle = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3Z" />
    <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
  </svg>
)

export const IconShield = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
