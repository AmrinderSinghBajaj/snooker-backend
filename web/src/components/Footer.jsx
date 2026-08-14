import { CONTACT, NAV_LINKS, PRODUCT_URL } from '../config'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-charcoal px-6 sm:px-10 py-14">
      <div className="mx-auto max-w-7xl flex flex-col gap-10 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dim text-ink font-display font-bold shadow-gold">
              B
            </span>
            <span className="font-display text-base font-semibold text-ivory">Bajaj Snooker</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-smoke">
            The complete operating system for snooker, pool and gaming clubs —
            live tables, billing, revenue and multi-club control, built for
            the counter.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-16 gap-y-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dim mb-4">
              Product
            </div>
            <ul className="space-y-2.5 text-sm text-smoke">
              {NAV_LINKS.slice(0, 4).map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-gold-light transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={PRODUCT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-light transition-colors"
                >
                  Live App ↗
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dim mb-4">
              Contact
            </div>
            <ul className="space-y-2.5 text-sm text-smoke">
              <li>{CONTACT.name}</li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="hover:text-gold-light transition-colors">
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT.phoneRaw}`} className="hover:text-gold-light transition-colors">
                  {CONTACT.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-smoke/70">
        <span>© {new Date().getFullYear()} Bajaj Snooker. All rights reserved.</span>
        <span>Crafted for clubs that run on precision.</span>
      </div>
    </footer>
  )
}
