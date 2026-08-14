import { motion } from 'framer-motion'
import Section from '../components/Section'
import ScreenshotStack from '../components/ScreenshotStack'
import UsageNote from '../components/UsageNote'

const bullets = [
  'Today, This Week and This Month roll up into animated donut and gauge cards the moment you open the section.',
  'Click through any card for the detail beneath it — itemized transactions, per-day totals, or a full calendar heatmap.',
  'A separate passcode locks the Revenue section from the rest of the app, independent of the login password.',
  'Search or filter any date range to pull transactions and outstanding dues for that window instantly.',
]

export default function RevenueAnalytics() {
  return (
    <Section
      id="revenue"
      eyebrow="Revenue Intelligence"
      title="Know exactly what the club earned — today, this week, this month."
      subtitle="Revenue lives behind its own passcode, and turns raw transactions into a picture you can read in seconds."
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
            the owner checks this once a day — enter the Revenue passcode, glance at Today vs. Week vs. Month, and tap straight through to any number that looks off.
          </UsageNote>
        </div>

        <div className="lg:col-span-3">
          <ScreenshotStack
            src="/screenshots/revenue.png"
            alt="Revenue & Analytics — daily, weekly and monthly breakdowns"
          />
        </div>
      </div>
    </Section>
  )
}
