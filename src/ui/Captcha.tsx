import { useEffect, useRef } from 'react'
import 'altcha' // registra <altcha-widget> (prueba de trabajo: se resuelve en el navegador, sin terceros ni cookies)
import 'altcha/i18n/es-es'
import { AUTH_API } from '../lib/config'

/**
 * Captcha propio. Llama a onChange(payload) al verificarse y onChange(null) si vence o falla.
 * El payload vale una sola vez: después de enviarlo, cambiar `resetKey` para pedir uno nuevo.
 */
export default function Captcha({ onChange, resetKey = 0 }: { onChange: (payload: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLElement>(null)
  const cb = useRef(onChange)
  cb.current = onChange

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ state: string; payload?: string }>).detail
      cb.current(d.state === 'verified' && d.payload ? d.payload : null)
    }
    el.addEventListener('statechange', h)
    return () => el.removeEventListener('statechange', h)
  }, [resetKey])

  return (
    // el div con key fuerza un widget nuevo (y un desafío nuevo) cada vez que cambia resetKey
    <div key={resetKey}>
      <altcha-widget ref={ref} challengeurl={`${AUTH_API}/captcha`} language="es-es" auto="onfocus" hidefooter />
    </div>
  )
}
