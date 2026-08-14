import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', delay = 0, glow = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, borderColor: 'rgba(201,162,75,0.55)' }}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8 transition-colors ${glow ? 'shadow-gold' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}
