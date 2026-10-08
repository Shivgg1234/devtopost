/**
 * Acoustic Atlas - IndexedDB Wrapper
 * Handles offline persistent storage for sessions and spots.
 */

const DB_NAME = 'AcousticAtlasDB';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';

export class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
          store.createIndex('spotName', 'spotName', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('timeOfDay', 'timeOfDay', { unique: false });
        }
      };
    });
  }

  async saveSession(session) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.put(session);
      req.onsuccess = () => resolve(session);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllSessions() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSession(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllData() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async exportJSON() {
    const sessions = await this.getAllSessions();
    const payload = {
      app: 'Acoustic Atlas',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sessionCount: sessions.length,
      sessions
    };
    return JSON.stringify(payload, null, 2);
  }

  async importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.sessions)) {
        throw new Error('Invalid backup format: missing sessions array.');
      }
      for (const session of data.sessions) {
        if (session.id && session.natureScore !== undefined) {
          await this.saveSession(session);
        }
      }
      return data.sessions.length;
    } catch (err) {
      throw new Error(`Import failed: ${err.message}`);
    }
  }
}

export const db = new Database();
