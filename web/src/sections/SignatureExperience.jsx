import GlassCard from '../components/GlassCard'
import Section from '../components/Section'
import { IconFilm, IconTv, IconSparkle } from '../components/icons'

const cards = [
  {
    icon: IconFilm,
    title: 'A Cinematic Opening',
    image: '/screenshots/login.png',
    desc: 'Every login begins with a physics-simulated break shot — camera sweeping in behind the cue, balls scattering with real elastic collisions, bullet-time on impact.',
  },
  {
    icon: IconTv,
    title: 'Live Lobby Display',
    desc: 'A public, no-login TV dashboard shows every table\'s status in real time, refreshing automatically — built for the wall behind your counter.',
  },
  {
    icon: IconSparkle,
    title: 'The Signature Coin',
    desc: 'Your club\'s logo is mapped onto a floating, slowly spinning brass coin — a small detail that makes the whole console feel considered.',
  },
]

export default function SignatureExperience() {
  return (
    <Section
      eyebrow="Signature Experience"
      title="Built to feel like the club it runs."
      subtitle="Small cinematic details, throughout — not just a dashboard, an experience your members notice."
    >
      <div className="grid md:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <GlassCard key={c.title} delay={i * 0.1} glow className={c.image ? 'overflow-hidden !p-0' : undefined}>
            {c.image && (
              <div className="bg-ink/60">
                <img src={c.image} alt={c.title} className="block w-full h-48 object-cover" loading="lazy" />
              </div>
            )}
            <div className={c.image ? 'p-6 sm:p-7' : ''}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold-light mb-5">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ivory mb-3">{c.title}</h3>
              <p className="text-sm text-smoke leading-relaxed">{c.desc}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </Section>
  )
}
