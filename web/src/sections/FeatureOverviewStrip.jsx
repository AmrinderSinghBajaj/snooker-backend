import { motion } from 'framer-motion'
import {
  IconTable,
  IconSplit,
  IconChart,
  IconCup,
  IconMembership,
  IconBuilding,
} from '../components/icons'

const items = [
  { icon: IconTable, label: 'Live Table & Session Control' },
  { icon: IconSplit, label: 'Split Billing, up to 6 Ways' },
  { icon: IconChart, label: 'Real-Time Revenue Analytics' },
  { icon: IconCup, label: 'Food & Drink Ordering' },
  { icon: IconMembership, label: 'Memberships & Discount Slabs' },
  { icon: IconBuilding, label: 'Multi-Club Superadmin' },
]

export default function FeatureOverviewStrip() {
  return (
    <div className="relative border-y border-white/10 bg-charcoal/60">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="flex flex-col items-center text-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 text-gold-light">
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-smoke leading-snug">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
