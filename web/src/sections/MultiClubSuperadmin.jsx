import { motion } from 'framer-motion'
import Section from '../components/Section'
import DeviceFrame from '../components/DeviceFrame'
import UsageNote from '../components/UsageNote'
import { IconBuilding } from '../components/icons'

const clubs = [
  { name: 'The Billiards Arena', slug: 'thebilliardsarena', status: 'Active' },
  { name: 'Cue Masters Lounge', slug: 'cuemasterslounge', status: 'Active' },
  { name: 'Rack & Roll Club', slug: 'rackandroll', status: 'Trial' },
]

const bullets = [
  'One superadmin console provisions and manages every club as its own tenant — its own owner, login and data.',
  'Create a club, and its subdomain, owner credentials and validity period are set up in one flow.',
  'White-label branding lives in a single config point per club — name, owner and logo flow automatically into the login screen, top bar and every exported record.',
  'Toggle a club active or inactive, or extend its validity, without touching any other tenant.',
]

export default function MultiClubSuperadmin() {
  return (
    <Section
      id="multi-club"
      eyebrow="Multi-Club / Superadmin"
      title="Run one club, or run a hundred."
      subtitle="A dedicated superadmin panel turns Bajaj Snooker into a white-label platform — provision new clubs in minutes, each fully isolated."
    >
      <div className="grid lg:grid-cols-5 gap-x-10 lg:gap-x-16 gap-y-12 items-center">
        <div className="relative lg:col-span-3">
          <DeviceFrame>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-smoke">
                  Superadmin — Clubs
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gold-light">
                  <IconBuilding className="h-3 w-3" /> 3 tenants
                </span>
              </div>
              <div className="space-y-2.5">
                {clubs.map((c, i) => (
                  <motion.div
                    key={c.slug}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-ivory">{c.name}</div>
                      <div className="text-xs text-smoke">{c.slug}.bajajsnooker.shop</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        c.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {c.status}
                    </span>
                  </motion.div>
                ))}
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-wider text-smoke/60">
                Illustrative preview
              </p>
            </div>
          </DeviceFrame>
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
            selling to a second club? Create it in the superadmin panel, hand over its login, and it's a fully separate, fully branded instance — no shared data, no extra setup on your end.
          </UsageNote>
        </div>
      </div>
    </Section>
  )
}
