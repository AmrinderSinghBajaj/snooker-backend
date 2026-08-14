import { motion } from 'framer-motion'
import Section from '../components/Section'
import ScreenshotStack from '../components/ScreenshotStack'
import UsageNote from '../components/UsageNote'

const bullets = [
  'Manage the menu with live inventory — colour-coded "only 3 left" and "out of stock" badges update as you sell.',
  'Order like a cart: build it up, then assign it straight to an active table session or a named walk-in.',
  'No photography required — menu items render as procedurally generated 3D models when no image is uploaded.',
  'Every food order bills straight into the right player\'s tab, split-ready alongside their table time.',
]

export default function FoodAndDrink() {
  return (
    <Section
      id="food"
      eyebrow="Food & Beverage"
      title="Order, track and bill the counter menu — without a single photo."
      subtitle="Live stock, a cart built for speed, and 3D models that stand in beautifully for product photography."
    >
      <div className="grid lg:grid-cols-5 gap-x-10 lg:gap-x-16 gap-y-12 items-center">
        <div className="lg:col-span-3">
          <ScreenshotStack src="/screenshots/food.png" alt="Food & Drink — menu, stock and cart" />
        </div>

        <div className="lg:col-span-2">
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
            a player calls out an order mid-game — staff builds it in the cart and hits <strong className="text-ivory font-medium">assign to table</strong>. It lands straight on that player's running bill, no separate ticket.
          </UsageNote>
        </div>
      </div>
    </Section>
  )
}
