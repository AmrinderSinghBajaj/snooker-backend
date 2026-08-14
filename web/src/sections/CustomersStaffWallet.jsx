import GlassCard from '../components/GlassCard'
import Section from '../components/Section'
import { IconUsers, IconWallet, IconShield } from '../components/icons'

const cards = [
  {
    icon: IconUsers,
    title: 'Customer Directory & Leaderboard',
    image: '/screenshots/customers.png',
    points: [
      'Every player ranked by revenue and sessions, with 🥇🥈🥉 badges for your top regulars',
      '"Last seen" timestamps and instant search across the full customer base',
    ],
    usage: 'Staff pull this up to greet a regular by name and spot who hasn\'t been in for a while.',
  },
  {
    icon: IconWallet,
    title: 'Advance Payments & Wallet',
    image: '/screenshots/wallet.png',
    points: [
      'Pre-loaded balances customers can spend down over future visits',
      'Full top-up and transaction history logged with method and note',
    ],
    usage: 'A member tops up ₹2,000 once, then bills draw down from that balance on every future visit.',
  },
  {
    icon: IconShield,
    title: 'Staff & Permissions',
    image: '/screenshots/employees.png',
    points: [
      'Granular, module-level access — view, edit or delete — for tables, billing, food, revenue and more',
      'Give staff exactly the counter access they need, nothing more',
    ],
    usage: 'Set it once when you hire someone — a counter staffer sees tables and billing, not revenue or settings.',
  },
]

export default function CustomersStaffWallet() {
  return (
    <Section
      id="customers"
      eyebrow="Customers, Wallet & Staff"
      title="Know your regulars. Trust your team."
      subtitle="A full customer relationship layer, a built-in wallet, and role-based access for every staff account."
    >
      <div className="grid md:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <GlassCard key={c.title} delay={i * 0.1} className="flex flex-col overflow-hidden !p-0">
            <div className="bg-ink/60">
              <img src={c.image} alt={c.title} className="block w-full h-48 object-cover object-top" loading="lazy" />
            </div>
            <div className="p-6 sm:p-7 flex flex-col flex-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold-light mb-5">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ivory mb-3">{c.title}</h3>
              <ul className="space-y-2.5 text-sm text-smoke leading-relaxed">
                {c.points.map((p, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-dim" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-5 pt-4 border-t border-white/10 text-xs text-smoke/80 leading-relaxed">
                <span className="text-gold-light font-semibold">In practice — </span>
                {c.usage}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </Section>
  )
}
