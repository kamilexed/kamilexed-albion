/**
 * albion_price_store.js
 * Shared Global Price Store across Refining, Farming, Crafting, and Prices pages.
 * Persists all manually entered and Europe AODP fetched item prices in BOTH:
 *   1. localStorage (`ALBION_GLOBAL_PRICES_V1`) — works across pages & tabs on http/https and Chromium file://
 *   2. window.name (`ALBION_PRICES_WIN:...`) — guarantees same-tab transfer even on browsers that isolate file:// localStorage (e.g. Firefox)
 */

(function () {
  'use strict';

  const GLOBAL_STORAGE_KEY = 'ALBION_GLOBAL_PRICES_V1';
  const WINDOW_NAME_PREFIX = 'ALBION_PRICES_WIN:';
  const CHANNEL_NAME = 'ALBION_GLOBAL_PRICES_CHANNEL_V1';
  const LEGACY_SESSION_KEYS = [
    'ALBION_REFINING_SESSION_V1',
    'ALBION_FARMING_SESSION_V1',
    'ALBION_CRAFTING_SESSION_V2',
    'ALBION_CRAFTING_SESSION_V1',
  ];

  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {}

  function readLocalStorage() {
    try {
      const raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  function readWindowName() {
    try {
      if (typeof window !== 'undefined' && typeof window.name === 'string' && window.name.startsWith(WINDOW_NAME_PREFIX)) {
        const parsed = JSON.parse(window.name.slice(WINDOW_NAME_PREFIX.length));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  function mergeByTimestamp(target, source) {
    let changed = false;
    Object.entries(source).forEach(([id, entry]) => {
      if (!entry || typeof entry.price !== 'number') return;
      const existing = target[id];
      const srcTs = Number(entry.updatedAt) || 0;
      const dstTs = existing ? (Number(existing.updatedAt) || 0) : -1;
      if (!existing || srcTs > dstTs) {
        target[id] = {
          price: Math.max(0, Math.round(entry.price)),
          age: entry.age && entry.age.text ? entry.age : { text: 'Saved', category: 'moderate' },
          updatedAt: srcTs || Date.now(),
        };
        changed = true;
      }
    });
    return changed;
  }

  function writeBoth(obj, notify = false) {
    const serialized = JSON.stringify(obj);
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEY, serialized);
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        window.name = WINDOW_NAME_PREFIX + serialized;
      }
    } catch (e) {}
    if (notify && broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'PRICES_UPDATED', ts: Date.now() });
      } catch (e) {}
    }
  }

  function readMerged() {
    const ls = readLocalStorage();
    const wn = readWindowName();
    const merged = {};
    mergeByTimestamp(merged, ls);
    const wnHadNewer = mergeByTimestamp(merged, wn);

    // Migrate legacy session prices only for IDs not yet in merged store
    let migrated = false;
    for (const key of LEGACY_SESSION_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.prices || typeof parsed.prices !== 'object') continue;
        Object.entries(parsed.prices).forEach(([id, entry]) => {
          if (!merged[id] && entry && typeof entry.price === 'number') {
            merged[id] = {
              price: Math.max(0, Math.round(entry.price)),
              age: entry.age && entry.age.text ? entry.age : { text: 'Saved', category: 'moderate' },
              updatedAt: 1,
            };
            migrated = true;
          }
        });
      } catch (e) {}
    }

    if (wnHadNewer || migrated) {
      writeBoth(merged);
    }
    return merged;
  }

  function loadAll() {
    return readMerged();
  }

  function getPrice(itemId) {
    const store = readMerged();
    return store[itemId] || null;
  }

  function setPrice(itemId, price, age = { text: 'Manual', category: 'stale' }) {
    if (!itemId) return;
    const store = readMerged();
    store[itemId] = {
      price: Math.max(0, Math.round(Number(price) || 0)),
      age: age && age.text ? age : { text: 'Manual', category: 'stale' },
      updatedAt: Date.now(),
    };
    writeBoth(store, true);
  }

  function setPricesBulk(entries) {
    if (!entries || typeof entries !== 'object') return;
    const store = readMerged();
    const now = Date.now();
    let changed = false;
    Object.entries(entries).forEach(([id, entry]) => {
      if (!id || !entry || typeof entry.price !== 'number') return;
      store[id] = {
        price: Math.max(0, Math.round(entry.price)),
        age: entry.age && entry.age.text ? entry.age : { text: 'Manual', category: 'stale' },
        updatedAt: now,
      };
      changed = true;
    });
    if (changed) writeBoth(store, true);
  }

  function applyToMap(priceMap) {
    if (!priceMap || typeof priceMap.set !== 'function') return 0;
    const store = readMerged();
    let count = 0;
    Object.entries(store).forEach(([id, entry]) => {
      if (entry && typeof entry.price === 'number') {
        priceMap.set(id, {
          price: Math.max(0, Math.round(entry.price)),
          age: entry.age && entry.age.text ? entry.age : { text: 'Saved', category: 'moderate' },
        });
        count++;
      }
    });
    return count;
  }

  function clearAll() {
    try {
      localStorage.removeItem(GLOBAL_STORAGE_KEY);
      for (const key of LEGACY_SESSION_KEYS) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.prices) {
          parsed.prices = {};
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        window.name = WINDOW_NAME_PREFIX + '{}';
      }
    } catch (e) {}
  }

  function countSaved() {
    return Object.keys(readMerged()).length;
  }

  function onExternalChange(callback) {
    if (typeof window === 'undefined' || typeof callback !== 'function') return;
    window.addEventListener('storage', (ev) => {
      if (ev.key === GLOBAL_STORAGE_KEY) {
        callback(readMerged());
      }
    });
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'PRICES_UPDATED') {
          callback(readMerged());
        }
      });
    }
    window.addEventListener('pageshow', (ev) => {
      if (ev.persisted) {
        callback(readMerged());
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        callback(readMerged());
      }
    });
  }

  const AlbionPriceStore = {
    GLOBAL_STORAGE_KEY,
    loadAll,
    getPrice,
    setPrice,
    setPricesBulk,
    applyToMap,
    clearAll,
    countSaved,
    onExternalChange,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AlbionPriceStore;
  if (typeof window !== 'undefined') window.AlbionPriceStore = AlbionPriceStore;
  if (typeof globalThis !== 'undefined') globalThis.AlbionPriceStore = AlbionPriceStore;
})();
