/**
 * Offline Data Manager for HMIS
 * Handles offline data storage and synchronization
 */

interface PendingChange {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
}

class OfflineManager {
  private dbName = 'HMISOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private pendingChanges: PendingChange[] = [];

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('pendingChanges')) {
          const changeStore = db.createObjectStore('pendingChanges', { keyPath: 'id' });
          changeStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('offlineData')) {
          const dataStore = db.createObjectStore('offlineData', { keyPath: 'key' });
        }
      };
    });
  }

  async storePendingChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const pendingChange: PendingChange = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      const request = store.add(pendingChange);

      request.onsuccess = () => {
        this.pendingChanges.push(pendingChange);
        console.log('Pending change stored:', pendingChange.id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store pending change');
        reject(new Error('Failed to store pending change'));
      };
    });
  }

  async getPendingChanges(): Promise<PendingChange[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['pendingChanges'], 'readonly');
      const store = transaction.objectStore('pendingChanges');
      const request = store.getAll();

      request.onsuccess = () => {
        this.pendingChanges = request.result || [];
        resolve(this.pendingChanges);
      };

      request.onerror = () => {
        console.error('Failed to get pending changes');
        resolve([]);
      };
    });
  }

  async removePendingChange(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.pendingChanges = this.pendingChanges.filter(change => change.id !== id);
        console.log('Pending change removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to remove pending change');
        resolve();
      };
    });
  }

  async storeOfflineData(key: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const request = store.put({ key, data, timestamp: Date.now() });

      request.onsuccess = () => {
        console.log('Offline data stored:', key);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store offline data');
        reject(new Error('Failed to store offline data'));
      };
    });
  }

  async getOfflineData(key: string): Promise<any> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };

      request.onerror = () => {
        console.error('Failed to get offline data');
        resolve(null);
      };
    });
  }

  async syncPendingChanges(): Promise<{ success: number; failed: number }> {
    const changes = await this.getPendingChanges();
    let success = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        const response = await fetch(change.url, {
          method: change.method,
          headers: change.headers,
          body: change.body
        });

        if (response.ok) {
          await this.removePendingChange(change.id);
          success++;
          console.log('Change synced successfully:', change.id);
        } else {
          change.retryCount++;
          if (change.retryCount >= 3) {
            await this.removePendingChange(change.id);
            failed++;
            console.error('Change failed after 3 retries:', change.id);
          } else {
            // Update retry count
            await this.updatePendingChange(change);
            failed++;
          }
        }
      } catch (error) {
        change.retryCount++;
        if (change.retryCount >= 3) {
          await this.removePendingChange(change.id);
          failed++;
          console.error('Change failed after 3 retries:', change.id, error);
        } else {
          await this.updatePendingChange(change);
          failed++;
        }
      }
    }

    return { success, failed };
  }

  private async updatePendingChange(change: PendingChange): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      const request = store.put(change);

      request.onsuccess = () => {
        console.log('Pending change updated:', change.id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to update pending change');
        resolve();
      };
    });
  }

  async clearOfflineData(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['offlineData', 'pendingChanges'], 'readwrite');
      
      const dataStore = transaction.objectStore('offlineData');
      const changeStore = transaction.objectStore('pendingChanges');
      
      dataStore.clear();
      changeStore.clear();

      transaction.oncomplete = () => {
        console.log('Offline data cleared');
        resolve();
      };

      transaction.onerror = () => {
        console.error('Failed to clear offline data');
        resolve();
      };
    });
  }

  getPendingChangesCount(): number {
    return this.pendingChanges.length;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                console.log('New content available');
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Initialize when module loads
offlineManager.init().catch(console.error);
