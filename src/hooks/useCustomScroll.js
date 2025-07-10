import { useEffect, useRef } from 'react'

export function useCustomScroll(isRotated, rotationDegree) {
  const scrollRef = useRef(null)
  
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isRotated) {
      // If not rotated, we want the browser to handle normal native scrolling
      return
    }

    let startX = 0
    let startY = 0
    let scrollTopStart = 0

    const onTouchStart = (e) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      scrollTopStart = el.scrollTop
    }

    const onTouchMove = (e) => {
      // Prevent the browser's default horizontal swipe (which triggers "Back" on iOS)
      if (e.cancelable) {
        e.preventDefault()
      }
      
      const deltaX = e.touches[0].clientX - startX
      const deltaY = e.touches[0].clientY - startY
      
      if (rotationDegree === 90) {
        // Physical swipe right (deltaX > 0) -> scroll UP (decrease scrollTop)
        el.scrollTop = scrollTopStart - deltaX
      } else if (rotationDegree === -90) {
        // Physical swipe right (deltaX > 0) -> scroll DOWN (increase scrollTop)
        el.scrollTop = scrollTopStart + deltaX
      } else if (Math.abs(rotationDegree) === 180) {
        // Upside down: physical swipe UP (deltaY < 0) -> scroll UP visually (decrease scrollTop)
        el.scrollTop = scrollTopStart + deltaY
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [isRotated, rotationDegree])

  return scrollRef
}
