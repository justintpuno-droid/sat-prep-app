import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer({ countDown = false, limitSeconds = 0, onExpire } = {}) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        if (countDown && next >= limitSeconds) {
          setRunning(false)
          clearInterval(id)
          onExpireRef.current?.()
          return limitSeconds
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, countDown, limitSeconds])

  const displayed = countDown ? Math.max(0, limitSeconds - elapsed) : elapsed
  const isExpired = countDown && elapsed >= limitSeconds

  const start = useCallback(() => setRunning(true), [])
  const pause = useCallback(() => setRunning(false), [])
  const reset = useCallback(() => { setElapsed(0); setRunning(false) }, [])

  return { seconds: displayed, elapsed, isExpired, running, start, pause, reset }
}
