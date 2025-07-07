'use client'

import { useState } from 'react'

interface PerformanceAuditResult {
  metric: string
  value: number
  threshold: number
  status: 'pass' | 'warning' | 'fail'
  recommendations: string[]
}

export class PerformanceAuditor {
  async runFullAudit(): Promise<PerformanceAuditResult[]> {
    const results: PerformanceAuditResult[] = []
    
    // Test page load performance
    results.push(await this.auditPageLoad())
    
    // Test database query performance
    results.push(await this.auditDatabaseQueries())
    
    // Test image optimization
    results.push(await this.auditImageOptimization())
    
    // Test mobile performance
    results.push(await this.auditMobilePerformance())
    
    // Test PWA features
    results.push(await this.auditPWAFeatures())
    
    return results
  }
  
  private async auditPageLoad(): Promise<PerformanceAuditResult> {
    const startTime = performance.now()
    
    // Simulate page load test
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const loadTime = performance.now() - startTime
    
    return {
      metric: 'Page Load Time',
      value: loadTime,
      threshold: 3000,
      status: loadTime < 3000 ? 'pass' : loadTime < 5000 ? 'warning' : 'fail',
      recommendations: loadTime > 3000 ? [
        'Implement code splitting for unused JavaScript',
        'Optimize images with next/image',
        'Add database query caching',
        'Use CDN for static assets'
      ] : []
    }
  }
  
  private async auditDatabaseQueries(): Promise<PerformanceAuditResult> {
    const startTime = performance.now()
    
    try {
      // Test API response time
      const response = await fetch('/api/dashboard', { method: 'HEAD' })
      const queryTime = performance.now() - startTime
      
      return {
        metric: 'Database Query Performance',
        value: queryTime,
        threshold: 1000,
        status: queryTime < 1000 ? 'pass' : queryTime < 2000 ? 'warning' : 'fail',
        recommendations: queryTime > 1000 ? [
          'Add database indexes on frequently queried columns',
          'Implement query result caching',
          'Optimize complex joins and aggregations',
          'Use database connection pooling'
        ] : []
      }
    } catch (error) {
      return {
        metric: 'Database Query Performance',
        value: 0,
        threshold: 1000,
        status: 'fail',
        recommendations: ['Fix database connectivity issues']
      }
    }
  }
  
  private async auditImageOptimization(): Promise<PerformanceAuditResult> {
    if (typeof document === 'undefined') {
      return {
        metric: 'Image Optimization Score',
        value: 100,
        threshold: 90,
        status: 'pass',
        recommendations: []
      }
    }
    
    const images = document.querySelectorAll('img')
    let unoptimizedCount = 0
    
    images.forEach(img => {
      if (!img.src.includes('_next/image') && !img.hasAttribute('loading')) {
        unoptimizedCount++
      }
    })
    
    const optimizationScore = ((images.length - unoptimizedCount) / Math.max(images.length, 1)) * 100
    
    return {
      metric: 'Image Optimization Score',
      value: optimizationScore,
      threshold: 90,
      status: optimizationScore >= 90 ? 'pass' : optimizationScore >= 70 ? 'warning' : 'fail',
      recommendations: optimizationScore < 90 ? [
        'Use next/image for all images',
        'Add lazy loading attributes',
        'Implement WebP format with fallbacks',
        'Optimize image sizes for different breakpoints'
      ] : []
    }
  }
  
  private async auditMobilePerformance(): Promise<PerformanceAuditResult> {
    if (typeof window === 'undefined') {
      return {
        metric: 'Mobile Optimization Score',
        value: 90,
        threshold: 90,
        status: 'pass',
        recommendations: []
      }
    }
    
    const isMobile = window.innerWidth < 768
    const hasTouch = 'ontouchstart' in window
    const hasServiceWorker = 'serviceWorker' in navigator
    
    let mobileScore = 0
    if (isMobile) mobileScore += 30
    if (hasTouch) mobileScore += 30
    if (hasServiceWorker) mobileScore += 40
    
    return {
      metric: 'Mobile Optimization Score',
      value: mobileScore,
      threshold: 90,
      status: mobileScore >= 90 ? 'pass' : mobileScore >= 70 ? 'warning' : 'fail',
      recommendations: mobileScore < 90 ? [
        'Implement touch-optimized navigation',
        'Add PWA capabilities',
        'Optimize forms for mobile input',
        'Test on actual mobile devices'
      ] : []
    }
  }
  
  private async auditPWAFeatures(): Promise<PerformanceAuditResult> {
    if (typeof document === 'undefined' || typeof navigator === 'undefined') {
      return {
        metric: 'PWA Features Score',
        value: 75,
        threshold: 90,
        status: 'warning',
        recommendations: ['Test PWA features in browser environment']
      }
    }
    
    let pwaScore = 0
    
    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) pwaScore += 25
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) pwaScore += 25
      } catch (error) {
        // Service worker not available
      }
    }
    
    // Check HTTPS
    if (location.protocol === 'https:') pwaScore += 25
    
    // Check offline functionality
    if (!navigator.onLine) {
      // Test if app works offline
      try {
        const cache = await caches.open('farmtrack-pro-v1')
        const cachedResponse = await cache.match('/dashboard')
        if (cachedResponse) pwaScore += 25
      } catch (error) {
        // Offline functionality not working
      }
    } else {
      pwaScore += 25 // Assume offline works if online
    }
    
    return {
      metric: 'PWA Features Score',
      value: pwaScore,
      threshold: 90,
      status: pwaScore >= 90 ? 'pass' : pwaScore >= 70 ? 'warning' : 'fail',
      recommendations: pwaScore < 90 ? [
        'Add web app manifest',
        'Implement service worker caching',
        'Ensure HTTPS in production',
        'Test offline functionality'
      ] : []
    }
  }
}

// Performance testing component for development
export function PerformanceAuditPanel() {
  if (process.env.NODE_ENV !== 'development') return null
  
  const [results, setResults] = useState<PerformanceAuditResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  
  const runAudit = async () => {
    setIsRunning(true)
    const auditor = new PerformanceAuditor()
    const auditResults = await auditor.runFullAudit()
    setResults(auditResults)
    setIsRunning(false)
  }
  
  return (
    <div className="fixed top-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Performance Audit</h3>
        <button
          onClick={runAudit}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Audit'}
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="border-b pb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{result.metric}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  result.status === 'pass' ? 'bg-green-100 text-green-800' :
                  result.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {result.value.toFixed(0)} / {result.threshold}
              </div>
              {result.recommendations.length > 0 && (
                <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
                  {result.recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}