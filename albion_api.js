/**
 * albion_api.js
 * Albion Online Data Project (AODP) API Client & LocalStorage Cache.
 * 
 * Handles URL batching, price age calculation, and rate-limit safety.
 */

(function () {
  'use strict';

  function factory() {


  const SERVERS = {
    europe: { id: 'europe', name: 'Europe', host: 'https://europe.albion-online-data.com' },
    west: { id: 'west', name: 'Americas (West)', host: 'https://west.albion-online-data.com' },
    east: { id: 'east', name: 'Asia (East)', host: 'https://east.albion-online-data.com' },
  };

  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL as requested in spec

  // In-memory fallback if localStorage is disabled or running in Node.js
  const memoryCache = new Map();

  function getCache(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem('AODP_' + key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() - parsed._timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      } else if (memoryCache.has(key)) {
        const entry = memoryCache.get(key);
        if (Date.now() - entry._timestamp < CACHE_TTL_MS) {
          return entry.data;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  }

  function setCache(key, data) {
    try {
      const payload = { _timestamp: Date.now(), data };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('AODP_' + key, JSON.stringify(payload));
      } else {
        memoryCache.set(key, payload);
      }
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }

  /**
   * Formats ISO timestamp into human-readable age & staleness category.
   */
  function formatPriceAge(isoDateString) {
    if (!isoDateString || isoDateString.startsWith('0001-01-01')) {
      return { text: 'No recent scan', category: 'stale', minutes: Infinity };
    }

    const priceTime = new Date(isoDateString).getTime();
    if (isNaN(priceTime)) {
      return { text: 'Unknown date', category: 'stale', minutes: Infinity };
    }

    const diffMs = Math.max(0, Date.now() - priceTime);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let text = '';
    let category = 'fresh';

    if (minutes < 60) {
      text = `${minutes}m ago`;
      category = minutes <= 30 ? 'fresh' : 'moderate';
    } else if (hours < 24) {
      text = `${hours}h ago`;
      category = hours <= 6 ? 'moderate' : 'aging';
    } else {
      text = `${days}d ago`;
      category = 'stale';
    }

    return { text, category, minutes };
  }

  /**
   * Fetches prices for an array of item IDs from AODP, batching requests if needed.
   * locations: comma separated e.g. "Thetford,Fort Sterling" or "Thetford"
   */
  async function fetchPrices({ server = 'europe', itemIds = [], locations = '', qualities = '1', forceRefresh = false }) {
    const srv = SERVERS[server] || SERVERS.europe;
    const cacheKey = `${srv.id}_${locations}_${qualities}_${[...itemIds].sort().join('_')}`;

    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true };
      }
    }

    // Chunk itemIds to ensure URL stays < 3000 chars (AODP safe threshold)
    const CHUNK_SIZE = 40;
    const chunks = [];
    for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
      chunks.push(itemIds.slice(i, i + CHUNK_SIZE));
    }

    const combinedResults = [];

    for (const chunk of chunks) {
      const idsParam = chunk.join(',');
      const params = [];
      if (locations) params.push(`locations=${encodeURIComponent(locations)}`);
      if (qualities) params.push(`qualities=${qualities}`);
      const queryString = params.length ? `?${params.join('&')}` : '';
      const url = `${srv.host}/api/v2/stats/prices/${idsParam}.json${queryString}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`AODP Error HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        combinedResults.push(...data);
      }
    }

    setCache(cacheKey, combinedResults);
    return { data: combinedResults, fromCache: false };
  }

    return {
      SERVERS,
      fetchPrices,
      formatPriceAge,
    };
  }

  const result = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = result;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.AlbionApi = result;
  }
  if (typeof window !== 'undefined') {
    window.AlbionApi = result;
  }
})();
