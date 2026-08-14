import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { NAV_LINKS, PRODUCT_URL } from '../config'

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-ink/85 backdrop-blur-lg border-b border-white/10 py-3' : 'bg-transparent py-5'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-6 sm:px-10 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dim text-ink font-display font-bold text-lg shadow-gold">
            B
          </span>
          <span className="font-display text-lg font-semibold tracking-wide text-ivory">
            Bajaj Snooker
          </span>
        </a>

        <div className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-smoke hover:text-gold-light transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <a
            href={PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10 transition-colors"
          >
            Visit Live App
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-ivory p-2"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-px bg-ivory mb-1.5" />
          <div className="w-6 h-px bg-ivory mb-1.5" />
          <div className="w-4 h-px bg-ivory" />
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="md:hidden overflow-hidden bg-ink/95 backdrop-blur-lg border-t border-white/10 mt-3"
        >
          <div className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-medium text-smoke hover:text-gold-light"
              >
                {link.label}
              </a>
            ))}
            <a
              href={PRODUCT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 rounded-full border border-gold/40 px-5 py-2.5 text-center text-sm font-semibold text-gold-light"
            >
              Visit Live App
            </a>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
