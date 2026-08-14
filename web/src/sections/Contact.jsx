import { useState } from 'react'
import { motion } from 'framer-motion'
import Section from '../components/Section'
import GlassCard from '../components/GlassCard'
import Button from '../components/Button'
import { CONTACT } from '../config'

export default function Contact() {
  const [form, setForm] = useState({ name: '', clubName: '', message: '' })

  const mailtoHref = () => {
    const subject = encodeURIComponent(`Enquiry about Bajaj Snooker${form.clubName ? ' — ' + form.clubName : ''}`)
    const bodyLines = [
      form.name && `Name: ${form.name}`,
      form.clubName && `Club: ${form.clubName}`,
      '',
      form.message || 'Hi Amrinder, I would like to know more about Bajaj Snooker.',
    ].filter(Boolean)
    const body = encodeURIComponent(bodyLines.join('\n'))
    return `mailto:${CONTACT.email}?subject=${subject}&body=${body}`
  }

  const whatsappHref = () => {
    const text = encodeURIComponent(
      `Hi Amrinder, I'm ${form.name || 'interested'} and would like to know more about Bajaj Snooker${
        form.clubName ? ` for ${form.clubName}` : ''
      }.`
    )
    return `https://wa.me/${CONTACT.phoneRaw}?text=${text}`
  }

  return (
    <Section
      id="contact"
      eyebrow="Get In Touch"
      title="Let's set your club up on Bajaj Snooker."
      subtitle="Reach out directly — every enquiry goes straight to the founder, not a queue."
    >
      <div className="grid lg:grid-cols-5 gap-8">
        <GlassCard className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold text-ivory">{CONTACT.name}</h3>
            <p className="mt-1 text-sm text-smoke">Founder, Bajaj Snooker</p>

            <div className="mt-8 space-y-5">
              <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 text-sm text-smoke hover:text-gold-light transition-colors group">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 group-hover:border-gold/40">
                  ✉
                </span>
                {CONTACT.email}
              </a>
              <a href={`tel:${CONTACT.phoneRaw}`} className="flex items-center gap-3 text-sm text-smoke hover:text-gold-light transition-colors group">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 group-hover:border-gold/40">
                  ☎
                </span>
                {CONTACT.phone}
              </a>
              <a
                href={`https://wa.me/${CONTACT.phoneRaw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-smoke hover:text-gold-light transition-colors group"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 group-hover:border-gold/40">
                  ↗
                </span>
                Message on WhatsApp
              </a>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-3" delay={0.1}>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-smoke mb-2">Your Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-ivory placeholder:text-smoke/50 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Rohan Sharma"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-smoke mb-2">Club Name</label>
                <input
                  type="text"
                  value={form.clubName}
                  onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-ivory placeholder:text-smoke/50 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Cue Masters Lounge"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-smoke mb-2">Message</label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-ivory placeholder:text-smoke/50 focus:outline-none focus:border-gold/50 transition-colors resize-none"
                placeholder="Tell us a bit about your club and what you're looking for..."
              />
            </div>
            <motion.div className="flex flex-wrap gap-4 pt-1">
              <Button href={mailtoHref()} variant="primary">
                Send Enquiry
              </Button>
              <Button href={whatsappHref()} target="_blank" variant="ghost">
                Send via WhatsApp
              </Button>
            </motion.div>
          </form>
        </GlassCard>
      </div>
    </Section>
  )
}
