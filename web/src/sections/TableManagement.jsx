import { motion } from 'framer-motion'
import Section from '../components/Section'
import ScreenshotStack from '../components/ScreenshotStack'
import UsageNote from '../components/UsageNote'

const bullets = [
  'Add any mix of assets — Snooker, Pool, Heyball, PlayStation, Chess, Carrom — each with its own hourly rate.',
  'One tap to start a session, or open the full setup for up to 4 players with autocomplete against past customers.',
  'Backdate a start time precisely with a Cupertino-style scroll wheel picker — perfect for correcting a late entry.',
  'A drift-corrected live timer reconciles against the server clock, so every table stays accurate even across a busy shift.',
]

export default function TableManagement() {
  return (
    <Section
      id="tables"
      eyebrow="Floor Control"
      title="Every table, every screen, live."
      subtitle="A single glance tells you what's running, what's idle, and what's overdue — across snooker, pool, gaming consoles and more."
    >
      <div className="grid lg:grid-cols-5 gap-x-10 lg:gap-x-16 gap-y-12 items-center">
        <div className="lg:col-span-2">
          <ul className="space-y-4">
            {bullets.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex gap-3 text-[15px] text-smoke leading-relaxed"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span>{b}</span>
              </motion.li>
            ))}
          </ul>
          <UsageNote>
            a table finishes racking, staff taps <strong className="text-ivory font-medium">Start Game</strong> once — no stopwatch, no paper log. The card on the dashboard turns live and starts counting immediately.
          </UsageNote>
        </div>

        <div className="lg:col-span-3">
          <ScreenshotStack
            src="/screenshots/dashboard.png"
            alt="Bajaj Snooker Arena Console — live table dashboard"
          />
        </div>
      </div>
    </Section>
  )
}
