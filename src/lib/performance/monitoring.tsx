interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  
  // Core Web Vitals monitoring
  initializeCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP()
    
    // First Input Delay (FID)
    this.observeFID()
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS()
    
    // Custom metrics
    this.observeCustomMetrics()
  }
  
  private observeLCP() {
    if (typeof window === 'undefined') return
    
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      
      this.recordMetric('LCP', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })
  }
  
  private observeFID() {
    if (typeof window === 'undefined') return
    
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      
      entries.forEach((entry: any) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime)
      })
    }).observe({ entryTypes: ['first-input'] })
  }
  
  private observeCLS() {
    if (typeof window === 'undefined') return
    
    let clsValue = 0
    
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          this.recordMetric('CLS', clsValue)
        }
      })
    }).observe({ entryTypes: ['layout-shift'] })
  }
  
  private observeCustomMetrics() {
    if (typeof window === 'undefined') return
    
    // Time to Interactive
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        this.recordMetric('TTI', navigationEntry.loadEventEnd - navigationEntry.fetchStart)
      }, 0)
    })
    
    // API Response Times
    this.interceptFetch()
  }
  
  private interceptFetch() {
    if (typeof window === 'undefined') return
    
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const startTime = performance.now()
      
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        
        // Record API response time
        if (typeof args[0] === 'string' && args[0].includes('/api/')) {
          this.recordMetric(`API-${args[0]}`, endTime - startTime)
        }
        
        return response
      } catch (error) {
        throw error
      }
    }
  }
  
  private recordMetric(name: string, value: number) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now()
    })
    
    // Send to analytics (in production)
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(name, value)
    }
    
    // Log performance issues
    this.checkThresholds(name, value)
  }
  
  private checkThresholds(name: string, value: number) {
    const thresholds: Record<string, number> = {
      LCP: 2500, // 2.5 seconds
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      TTI: 3800, // 3.8 seconds
    }
    
    if (thresholds[name] && value > thresholds[name]) {
      console.warn(`Performance threshold exceeded: ${name} = ${value}ms (threshold: ${thresholds[name]}ms)`)
    }
  }
  
  private sendToAnalytics(name: string, value: number) {
    // Integration with analytics services
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'performance',
        event_label: name,
        value: Math.round(value)
      })
    }
  }
  
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }
  
  getAverageMetric(name: string): number {
    const nameMetrics = this.metrics.filter(m => m.name === name)
    if (nameMetrics.length === 0) return 0
    
    return nameMetrics.reduce((sum, m) => sum + m.value, 0) / nameMetrics.length
  }
}

export const performanceMonitor = new PerformanceMonitor()

// React component for performance debugging
export function PerformanceDebugger() {
  if (process.env.NODE_ENV !== 'development') return null
  
  const metrics = performanceMonitor.getMetrics()
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">Performance Metrics</h3>
      {['LCP', 'FID', 'CLS', 'TTI'].map(metric => (
        <div key={metric} className="flex justify-between">
          <span>{metric}:</span>
          <span>{performanceMonitor.getAverageMetric(metric).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}