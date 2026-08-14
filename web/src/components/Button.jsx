import { motion } from 'framer-motion'

export default function Button({ children, href, onClick, variant = 'primary', className = '', target }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-all duration-300'
  const variants = {
    primary:
      'bg-gradient-to-r from-gold-light via-gold to-gold-dim text-ink shadow-gold hover:shadow-[0_0_55px_rgba(201,162,75,0.4)]',
    ghost:
      'border border-white/20 text-ivory hover:border-gold/60 hover:bg-white/5',
  }

  const Component = href ? motion.a : motion.button

  return (
    <Component
      href={href}
      onClick={onClick}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </Component>
  )
}
