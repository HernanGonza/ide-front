import { motion, type HTMLMotionProps } from 'motion/react'

/** Entrada suave (fade + slide). `i` escalona elementos de una grilla. */
export default function Reveal({ i = 0, className, children, ...rest }: { i?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
