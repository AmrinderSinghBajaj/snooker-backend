import { motion } from 'framer-motion'
import Section from '../components/Section'
import ScreenshotStack from '../components/ScreenshotStack'
import UsageNote from '../components/UsageNote'

const bullets = [
  'Configure as many slabs as you need — Premium Members, Bronze Customer, whatever fits your club — each with its own discount percentage.',
  'Scope each slab to Table Time only, Food & Drink only, or Both, so a discount never applies where you didn\'t intend it.',
  'A built-in Club Owner slab at 100% off covers your own play automatically.',
  'Assign a player to a slab once in the Player Assignment tab — every bill after that discounts itself.',
]

export default function Memberships() {
  return (
    <Section
      id="memberships"
      eyebrow="Memberships"
      title="Discount slabs that apply themselves."
      subtitle="Configure a slab once — table time only, food & drink only, or both — then assign players to it. Every future bill discounts automatically."
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
            assign a slab to a player once, on sign-up. Every session and every food order after that discounts itself — nobody at the counter has to remember the percentage.
          </UsageNote>
        </div>

        <div className="lg:col-span-3">
          <ScreenshotStack
            src="/screenshots/memberships.png"
            alt="Membership Section — discount slabs configuration"
          />
        </div>
      </div>
    </Section>
  )
}
