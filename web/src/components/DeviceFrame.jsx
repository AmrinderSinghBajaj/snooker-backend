import { motion } from 'framer-motion'

export default function DeviceFrame({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotateX: 6 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1200 }}
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ${className}`}
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gold-line opacity-60" />
      <div className="rounded-xl border border-white/10 bg-ink/90 overflow-hidden">
        {children}
      </div>
    </motion.div>
  )
}
