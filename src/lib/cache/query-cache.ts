interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  delete(key: string): void {
    this.cache.delete(key)
  }
}

export const queryCache = new QueryCache()

// Cache wrapper for database operations
export function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttlMinutes: number = 5
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Check cache first
      const cached = queryCache.get<T>(key)
      if (cached) {
        resolve(cached)
        return
      }
      
      // Execute operation
      const result = await operation()
      
      // Cache result
      queryCache.set(key, result, ttlMinutes)
      
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}