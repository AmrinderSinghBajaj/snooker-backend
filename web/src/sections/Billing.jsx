import { motion } from 'framer-motion'
import Section from '../components/Section'
import ScreenshotStack from '../components/ScreenshotStack'
import UsageNote from '../components/UsageNote'

const bullets = [
  'Stop a session and the time charge is computed automatically — then split it up to 6 ways with shares auto-equalized.',
  'A dedicated ledger separates "All Bills" from "Outstanding," with live search, discount totals and manual-entry badges.',
  'Outstanding dues aggregate per player across sessions — send a one-click, itemized WhatsApp reminder in seconds.',
  'Every payment tracks its mode — cash, online, wallet or split — with a full itemized detail view on demand.',
]

export default function Billing() {
  return (
    <Section
      id="billing"
      eyebrow="Billing & Payments"
      title="Split the bill in one tap. Chase nothing."
      subtitle="From stop-the-clock to settled payment, billing is built for a counter that never slows down."
    >
      <div className="grid lg:grid-cols-5 gap-x-10 lg:gap-x-16 gap-y-12 items-center">
        <div className="order-2 lg:order-1 lg:col-span-3">
          <ScreenshotStack
            src="/screenshots/billing.png"
            alt="Billing Section — all bills and outstanding ledger"
          />
        </div>

        <div className="order-1 lg:order-2 lg:col-span-2">
          <ul className="space-y-4">
            {bullets.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 16 }}
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
            when a table's done, staff hits <strong className="text-ivory font-medium">Stop</strong> — the time charge is already calculated. Split it if the group's paying separately, mark it paid, and the ledger closes itself out.
          </UsageNote>
        </div>
      </div>
    </Section>
  )
}
