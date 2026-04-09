// src/lib/hooks/useDeviceInfo.ts
'use client'

import { useState, useEffect } from 'react'

// Breakpoints aligned with Tailwind CSS defaults
// sm:640  md:768  lg:1024  xl:1280  2xl:1536
export const BREAKPOINTS = {
  xs: 480,   // compact phones (iPhone SE, Galaxy A series)
  sm: 640,   // large phones / small landscape phones
  md: 768,   // tablets portrait / large phones landscape
  lg: 1024,  // tablets landscape / small laptops
  xl: 1280,  // standard laptops / desktops
  '2xl': 1536, // large desktops / wide monitors
} as const

interface DeviceInfo {
  // Primary viewport class
  isMobile: boolean        // < 768px
  isTablet: boolean        // 768px – 1023px
  isDesktop: boolean       // ≥ 1024px

  // Granular size flags (backward-compatible additions)
  isSmallMobile: boolean   // < 480px  (iPhone SE, compact phones)
  isLargeMobile: boolean   // 480px – 767px
  isSmallTablet: boolean   // 768px – 1023px  (same as isTablet, alias)
  isLargeTablet: boolean   // same as isSmallDesktop — 1024px – 1279px
  isSmallDesktop: boolean  // 1024px – 1279px  (small laptops)
  isLargeDesktop: boolean  // ≥ 1280px

  // Input & touch
  isTouch: boolean
  inputMode: 'touch' | 'mouse' | 'hybrid'

  // Convenience union
  viewport: 'mobile' | 'tablet' | 'desktop'

  // Raw width for custom decisions
  width: number
}

// Derive SSR-safe initial state from matchMedia if in browser, otherwise assume desktop
function getInitialState(): DeviceInfo {
  if (typeof window === 'undefined') {
    // Server — assume desktop (most common for dashboards)
    return buildState(1280, false)
  }
  return buildState(window.innerWidth, isTouchDevice())
}

function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

function buildState(width: number, touch: boolean): DeviceInfo {
  const isMobile      = width < BREAKPOINTS.md           // < 768
  const isTablet      = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg  // 768–1023
  const isDesktop     = width >= BREAKPOINTS.lg           // ≥ 1024

  const isSmallMobile = width < BREAKPOINTS.xs            // < 480
  const isLargeMobile = width >= BREAKPOINTS.xs && width < BREAKPOINTS.md  // 480–767
  const isSmallTablet = isTablet
  const isSmallDesktop = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl // 1024–1279
  const isLargeTablet  = isSmallDesktop
  const isLargeDesktop = width >= BREAKPOINTS.xl          // ≥ 1280

  const viewport: DeviceInfo['viewport'] = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

  const inputMode: DeviceInfo['inputMode'] =
    touch && isMobile  ? 'touch'  :
    touch && !isMobile ? 'hybrid' :
    'mouse'

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isLargeMobile,
    isSmallTablet,
    isLargeTablet,
    isSmallDesktop,
    isLargeDesktop,
    isTouch: touch,
    inputMode,
    viewport,
    width,
  }
}

export function useDeviceInfo(): DeviceInfo {
  const [state, setState] = useState<DeviceInfo>(getInitialState)

  useEffect(() => {
    // Re-derive on mount in case SSR guess differs from actual client size
    setState(buildState(window.innerWidth, isTouchDevice()))

    const handleResize = () => {
      setState(buildState(window.innerWidth, isTouchDevice()))
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Detect first real touch event on hybrid devices (e.g. Surface, iPad with keyboard)
    const handleFirstTouch = () => {
      setState(buildState(window.innerWidth, true))
    }
    window.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('touchstart', handleFirstTouch)
    }
  }, [])

  return state
}

// ─── Standalone utility hooks (kept for backward compatibility) ────────────────

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

export function useTouch(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return isTouchDevice()
  })

  useEffect(() => {
    setIsTouch(isTouchDevice())
    const handleTouch = () => setIsTouch(true)
    window.addEventListener('touchstart', handleTouch, { once: true, passive: true })
    return () => window.removeEventListener('touchstart', handleTouch)
  }, [])

  return isTouch
}
