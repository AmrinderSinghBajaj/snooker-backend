import { motion } from 'framer-motion'

export default function Section({ id, eyebrow, title, subtitle, children, className = '' }) {
  return (
    <section id={id} className={`relative py-24 sm:py-32 px-6 sm:px-10 ${className}`}>
      <div className="mx-auto max-w-6xl">
        {(eyebrow || title) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-14 max-w-2xl"
          >
            {eyebrow && (
              <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
                <span className="h-px w-8 bg-gold-dim" />
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-ivory">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-5 text-base sm:text-lg text-smoke leading-relaxed">{subtitle}</p>
            )}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  )
}
