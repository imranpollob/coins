/**
 * Main Application Entry Point
 */
import { KrakenAPI } from './api.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const api = new KrakenAPI();
  const ui = new UI();

  // Show loading state
  ui.setLoading(true);

  // Initial fetch
  await api.fetchAssetPairs();

  // Initialize UI with data
  ui.init(api);
  ui.setLoading(false);

  // Load saved charts
  ui.renderCharts();
});
