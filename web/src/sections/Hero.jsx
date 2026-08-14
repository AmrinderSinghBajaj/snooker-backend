import { motion } from 'framer-motion'
import Button from '../components/Button'
import ScreenshotStack from '../components/ScreenshotStack'
import { PRODUCT_URL } from '../config'

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-light"
            >
              Club Management, Reimagined
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] text-ivory"
            >
              The complete{' '}
              <span className="text-gold-gradient">operating system</span>{' '}
              for your snooker &amp; billiards club
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.34 }}
              className="mt-6 text-lg text-smoke leading-relaxed max-w-lg"
            >
              This is the real console — live table control, split billing,
              revenue analytics, memberships and multi-club oversight, running
              at the counter as Bajaj Snooker, every day.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.46 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button href={PRODUCT_URL} target="_blank">
                Visit the Live App
              </Button>
              <Button href="#contact" variant="ghost">
                Book a Walkthrough
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ScreenshotStack
              src="/screenshots/dashboard.png"
              alt="Bajaj Snooker Arena Console — the real, live dashboard"
            />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 1 }}
        className="mt-20 flex flex-col items-center gap-2 text-smoke/60"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <div className="h-8 w-px bg-gradient-to-b from-gold/50 to-transparent" />
      </motion.div>
    </section>
  )
}
