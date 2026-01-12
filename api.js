/**
 * Kraken API Module
 * Fetches and manages asset pairs from Kraken API.
 */

const COINBASE_API_URL = 'https://api.exchange.coinbase.com/products';

export class KrakenAPI { // Name kept for compatibility, acting as CryptoAPI
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
      const CACHE_VERSION = 'v3'; // Increment for Coinbase switch
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
        console.warn('Could not load tokens.json, falling back to Coinbase API', e);
      }

      // Fallback to live API if static file fails
      const response = await fetch(COINBASE_API_URL);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const apiData = await response.json();

      // Process and format the pairs from Coinbase API
      this.pairs = apiData
        .filter(pair =>
          pair.quote_currency === 'USD' &&
          pair.status === 'online' &&
          !pair.trading_disabled
        )
        .map(pair => ({
          symbol: pair.id,          // e.g. BTC-USD
          id: pair.base_currency,   // e.g. BTC
          display: pair.display_name // e.g. BTC/USD
        }))
        .sort((a, b) => a.display.localeCompare(b.display));

      // Cache the processed data
      this.cachePairs();

      return this.pairs;
    } catch (error) {
      console.error('Failed to fetch asset pairs:', error);
      return [];
    }
  }

  cachePairs() {
    const CACHE_VERSION = 'v3';
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

    // First get all matching pairs
    const matches = this.pairs.filter(pair =>
      pair.display.toLowerCase().includes(lowerQuery) ||
      pair.id.toLowerCase().includes(lowerQuery)
    );

    // Then sort them by relevance
    matches.sort((a, b) => {
      const aDisplay = a.display.toLowerCase();
      const bDisplay = b.display.toLowerCase();
      const aId = a.id.toLowerCase();
      const bId = b.id.toLowerCase();

      // 1. Exact match (e.g. "SOL" -> "SOL/USD" base currency match)
      // Check if the base currency exactly matches the query
      const aBase = a.id.split('-')[0].toLowerCase(); // Coinbase ID format is BASE-QUOTE e.g. BTC-USD
      const bBase = b.id.split('-')[0].toLowerCase();

      const aExact = aBase === lowerQuery;
      const bExact = bBase === lowerQuery;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // 2. Starts with (e.g. "SOL" -> "SOL/USD" is better than "ABSOL/USD")
      const aStartsWith = aDisplay.startsWith(lowerQuery) || aId.startsWith(lowerQuery);
      const bStartsWith = bDisplay.startsWith(lowerQuery) || bId.startsWith(lowerQuery);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // 3. Alphabetical fallback
      return aDisplay.localeCompare(bDisplay);
    });

    return matches.slice(0, 50);
  }
}
