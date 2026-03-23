import { useEffect, useState, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}

export function AnimatedNumber({ value, duration = 1000, prefix = '', suffix = '', decimals = 0 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>(0)
  const startTime = useRef<number>(0)

  useEffect(() => {
    const start = ref.current
    startTime.current = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = start + (value - start) * eased

      setDisplay(current)
      ref.current = current

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  const formatted = decimals > 0
    ? display.toFixed(decimals).replace('.', ',')
    : Math.round(display).toLocaleString('pt-BR')

  return <span>{prefix}{formatted}{suffix}</span>
}
