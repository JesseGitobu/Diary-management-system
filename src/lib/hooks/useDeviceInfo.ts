// src/hooks/useDeviceInfo.ts
'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    if (media.addEventListener) {
      media.addEventListener('change', listener)
    } else {
      media.addListener(listener)
    }
    
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener)
      } else {
        media.removeListener(listener)
      }
    }
  }, [query])

  return matches
}

export function useTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      )
    }

    setIsTouch(checkTouch())

    const handleTouch = () => setIsTouch(true)
    window.addEventListener('touchstart', handleTouch, { once: true, passive: true })
    
    return () => {
      window.removeEventListener('touchstart', handleTouch)
    }
  }, [])

  return isTouch
}

interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  viewport: 'mobile' | 'tablet' | 'desktop'
  inputMode: 'touch' | 'mouse' | 'hybrid'
}

export function useDeviceInfo(): DeviceInfo {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1025px)')
  const isTouch = useTouch()

  const viewport = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  
  const inputMode = 
    isTouch && isMobile ? 'touch' : 
    isTouch && !isMobile ? 'hybrid' : 
    'mouse'

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    viewport,
    inputMode
  }
}
