// Service Worker for HMIS Offline Functionality
const CACHE_NAME = 'hmis-cache-v1';
const API_CACHE_NAME = 'hmis-api-cache-v1';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/patients/,
  /\/api\/vitals/,
  /\/api\/prescriptions/,
  /\/api\/health/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Fall back to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This request requires an internet connection',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fall back to network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for static asset:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

// Sync offline data when connection is restored
async function doBackgroundSync() {
  try {
    // Get pending changes from IndexedDB
    const pendingChanges = await getPendingChanges();
    
    if (pendingChanges.length > 0) {
      console.log('Syncing pending changes:', pendingChanges.length);
      
      for (const change of pendingChanges) {
        try {
          await syncChange(change);
          await removePendingChange(change.id);
        } catch (error) {
          console.error('Failed to sync change:', error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Get pending changes from IndexedDB
async function getPendingChanges() {
  return new Promise((resolve) => {
    const request = indexedDB.open('HMISOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingChanges'], 'readonly');
      const store = transaction.objectStore('pendingChanges');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        resolve([]);
      };
    };
    
    request.onerror = () => {
      resolve([]);
    };
  });
}

// Sync a single change
async function syncChange(change) {
  const response = await fetch(change.url, {
    method: change.method,
    headers: change.headers,
    body: change.body
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response;
}

// Remove synced change from IndexedDB
async function removePendingChange(id) {
  return new Promise((resolve) => {
    const request = indexedDB.open('HMISOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
    };
    
    request.onerror = () => resolve();
  });
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker loaded');
