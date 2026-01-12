/**
 * Kraken API Module
 * Fetches and manages asset pairs from Kraken API.
 */

const KRAKEN_API_URL = 'https://api.kraken.com/0/public/AssetPairs';

export class KrakenAPI {
  constructor() {
    this.pairs = [];
  }

  /**
   * Fetches tradable asset pairs.
   * Uses local static tokens.json for performance, falls back to API if needed.
   * @returns {Promise<Array>} List of formatted asset pairs.
   */
  async fetchAssetPairs() {
    try {
      // Check if we have cached data in localStorage
      const CACHE_VERSION = 'v2'; // Increment to invalidate old cache
      const cachedData = localStorage.getItem(`kraken_pairs_cache_${CACHE_VERSION}`);
      const cachedTime = localStorage.getItem(`kraken_pairs_timestamp_${CACHE_VERSION}`);
      const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

      // Valid cache? Return it.
      if (cachedData && cachedTime && (Date.now() - cachedTime < cacheDuration)) {
        this.pairs = JSON.parse(cachedData);
        return this.pairs;
      }

      // Try fetching static file first (much faster)
      let data = [];
      try {
        const response = await fetch('tokens.json');
        if (response.ok) {
          data = await response.json();
          // Static file is already formatted, just assign it
          this.pairs = data;

          // Cache it
          this.cachePairs();
          return this.pairs;
        }
      } catch (e) {
        console.warn('Could not load tokens.json, falling back to Kraken API', e);
      }

      // Fallback to live API if static file fails
      const response = await fetch(KRAKEN_API_URL);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const apiData = await response.json();

      if (apiData.error && apiData.error.length > 0) {
        console.error('Kraken API returned errors:', apiData.error);
        return [];
      }

      // Process and format the pairs from API
      this.pairs = Object.values(apiData.result)
        .map(pair => ({
          symbol: pair.wsname || pair.altname, // Prefer wsname (e.g., XBT/USD)
          id: pair.altname, // e.g., XBTUSD
          formatted: pair.wsname ? pair.wsname.replace('/', '') : pair.altname, // e.g. XBTUSD
          base: pair.base,
          quote: pair.quote,
          display: pair.wsname || pair.altname // Display name for UI
        }))
        .filter(p => p.symbol); // Ensure it has a symbol

      // Sort purely by symbol name
      this.pairs.sort((a, b) => a.display.localeCompare(b.display));

      // Cache the processed data
      this.cachePairs();

      return this.pairs;
    } catch (error) {
      console.error('Failed to fetch asset pairs:', error);
      return [];
    }
  }

  cachePairs() {
    const CACHE_VERSION = 'v2';
    localStorage.setItem(`kraken_pairs_cache_${CACHE_VERSION}`, JSON.stringify(this.pairs));
    localStorage.setItem(`kraken_pairs_timestamp_${CACHE_VERSION}`, Date.now());
  }

  /**
   * Search for pairs matching a query string.
   * @param {string} query 
   * @returns {Array} Filtered list of pairs.
   */
  search(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return this.pairs.filter(pair =>
      pair.display.toLowerCase().includes(lowerQuery) ||
      pair.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 50); // Limit results for performance
  }
}
