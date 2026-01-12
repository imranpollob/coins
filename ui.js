/**
 * UI Management Module
 */

export class UI {
  constructor() {
    this.elements = {
      widgetContainer: document.getElementById('widget-container'),
      searchInput: document.getElementById('coin-search'),
      searchResults: document.getElementById('search-results'),
      selectedTags: document.getElementById('selected-tags'),
      loadingIndicator: document.getElementById('loading-indicator')
    };
    this.selectedPairs = JSON.parse(localStorage.getItem('selectedCoords')) || ['BTC/USD', 'ETH/USD'];
    this.api = null;

    // Bind methods
    this.handleSearch = this.handleSearch.bind(this);
    this.handleSelection = this.handleSelection.bind(this);
    this.removePair = this.removePair.bind(this);
    this.closeSearch = this.closeSearch.bind(this);
  }

  init(api) {
    this.api = api;

    // Event Listeners
    this.elements.searchInput.addEventListener('input', this.handleSearch);
    this.elements.searchInput.addEventListener('focus', this.handleSearch);

    // Click outside to close search
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.closeSearch();
      }
    });

    // Initial render of tags
    this.renderTags();
  }

  setLoading(isLoading) {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
  }

  handleSearch(e) {
    const query = e.target.value.trim();
    if (query.length === 0) {
      this.closeSearch();
      return;
    }

    const results = this.api.search(query);
    this.renderSearchResults(results);
  }

  renderSearchResults(results) {
    this.elements.searchResults.innerHTML = '';

    if (results.length === 0) {
      this.elements.searchResults.style.display = 'none';
      return;
    }

    results.forEach(pair => {
      const li = document.createElement('li');
      li.textContent = pair.display;
      li.addEventListener('click', () => this.handleSelection(pair));
      this.elements.searchResults.appendChild(li);
    });

    this.elements.searchResults.style.display = 'block';
  }

  closeSearch() {
    this.elements.searchResults.style.display = 'none';
  }

  handleSelection(pair) {
    if (!this.selectedPairs.includes(pair.display)) {
      this.selectedPairs.push(pair.display);
      this.saveSelections();
      this.renderTags();
      this.renderCharts();
    }
    this.elements.searchInput.value = '';
    this.closeSearch();
  }

  removePair(pairName) {
    this.selectedPairs = this.selectedPairs.filter(p => p !== pairName);
    this.saveSelections();
    this.renderTags();
    this.renderCharts();
  }

  saveSelections() {
    localStorage.setItem('selectedCoords', JSON.stringify(this.selectedPairs));
  }

  renderTags() {
    this.elements.selectedTags.innerHTML = '';
    this.selectedPairs.forEach(pair => {
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.innerHTML = `
                ${pair}
                <span class="remove-tag" data-pair="${pair}">&times;</span>
            `;
      tag.querySelector('.remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePair(pair);
      });
      this.elements.selectedTags.appendChild(tag);
    });
  }

  async renderCharts() {
    this.elements.widgetContainer.innerHTML = '';

    if (this.selectedPairs.length === 0) {
      this.elements.widgetContainer.innerHTML = '<div style="width:100%; text-align:center; color: #8d949e; margin-top: 50px;">No coins selected. Search to add some!</div>';
      return;
    }

    // Ensure TradingView script is loaded once
    if (!window.TradingView) {
      await new Promise((resolve) => {
        if (document.getElementById('tv-script')) {
          // Script already adding but maybe not loaded, poll for it
          const check = setInterval(() => {
            if (window.TradingView) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        } else {
          const script = document.createElement('script');
          script.id = 'tv-script';
          script.src = 'https://s3.tradingview.com/tv.js';
          script.type = 'text/javascript';
          script.onload = resolve;
          document.head.appendChild(script);
        }
      });
    }

    this.selectedPairs.forEach(pairName => {
      // TradingView widget expects format like KRAKEN:BTCUSD
      const symbolForTV = `KRAKEN:${pairName.replace('/', '')}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'chart-wrapper';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container';

      const innerDiv = document.createElement('div');
      innerDiv.id = `tradingview_${pairName.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;
      innerDiv.style.height = '100%';
      innerDiv.style.width = '100%';

      widgetDiv.appendChild(innerDiv);
      wrapper.appendChild(widgetDiv);
      this.elements.widgetContainer.appendChild(wrapper);

      setTimeout(() => {
        new TradingView.widget({
          "autosize": true,
          "symbol": symbolForTV,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "withdateranges": true,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "details": true,
          "calendar": false,
          "container_id": innerDiv.id
        });
      }, 0);
    });
  }
}
