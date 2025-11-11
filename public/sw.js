const CACHE_NAME = 'dairytrack-pro-v1'
const OFFLINE_CACHE = 'dairytrack-offline-v1'

// Essential files to cache immediately
const ESSENTIAL_CACHE = [
  '/dashboard',
  '/dashboard/animals',
  '/dashboard/production',
  '/dashboard/feed',
  '/dashboard/reports',
  '/offline',
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js'
]

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first (for static assets)
  cacheFirst: [
    /\/_next\/static\//,
    /\/icons\//,
    /\.(png|jpg|jpeg|svg|webp|ico)$/
  ],
  
  // Network first (for API calls)
  networkFirst: [
    /\/api\//
  ],
  
  // Stale while revalidate (for pages)
  staleWhileRevalidate: [
    /\/dashboard/,
    /^\/$/ // Home page
  ]
}

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ESSENTIAL_CACHE))
      .then(() => self.skipWaiting())
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})


// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
// Fetch event with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Apply cache strategy based on URL pattern
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pattern.test(url.pathname))) {
      event.respondWith(handleRequest(request, strategy))
      return
    }
  }
  
  // Default to network first
  event.respondWith(handleRequest(request, 'networkFirst'))
})

// Handle different caching strategies
async function handleRequest(request, strategy) {
  const cache = await caches.open(CACHE_NAME)
  
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request, cache)
    case 'networkFirst':
      return networkFirst(request, cache)
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, cache)
    default:
      return fetch(request)
  }
}

async function cacheFirst(request, cache) {
  const cached = await cache.match(request)
  if (cached) return cached
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return cached || new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cache) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    return cached || caches.match('/offline')
  }
}

async function staleWhileRevalidate(request, cache) {
  const cached = await cache.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  })
  
  return cached || fetchPromise
}