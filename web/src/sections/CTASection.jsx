import { motion } from 'framer-motion'
import Button from '../components/Button'
import { PRODUCT_URL } from '../config'

export default function CTASection() {
  return (
    <section className="relative py-24 px-6 sm:px-10 overflow-hidden">
      <div className="absolute inset-0 bg-radial-fade" />
      <div className="absolute inset-x-0 top-0 h-px bg-gold-line" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-ivory leading-tight">
          See it running a <span className="text-gold-gradient">real club</span>, right now.
        </h2>
        <p className="mt-5 text-lg text-smoke">
          Bajaj Snooker isn't a concept — it's live, at the counter, today.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button href={PRODUCT_URL} target="_blank">
            Open the Live App
          </Button>
          <Button href="#contact" variant="ghost">
            Talk to Amrinder
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
