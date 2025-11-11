'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

export function PWARegister() {
  const toastIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let refreshing = false

    // Handle service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })

        console.log('Service Worker registered:', registration.scope)

        // Check for updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)

        // Check for updates on page load
        registration.update()

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New service worker is ready
                showUpdateNotification(() => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                })
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()

    // Cleanup function
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
      }
    }
  }, [])

  const showUpdateNotification = (onUpdate: () => void) => {
    // Dismiss any existing update toast
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
    }

    // Show update toast with custom action button
    toastIdRef.current = toast(
      (t) => (
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex-1">
            <p className="font-medium text-sm">New version available!</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Click to update and get the latest features
            </p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              onUpdate()
            }}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
          >
            Update
          </button>
        </div>
      ),
      {
        duration: Infinity,
        icon: '🔄',
        style: {
          background: '#1f2937',
          color: '#fff',
          maxWidth: '500px',
        },
      }
    )
  }

  return null
}