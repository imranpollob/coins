const fs = require('fs');

async function generateTokens() {
  try {
    console.log('Fetching products from Coinbase API...');
    const response = await fetch('https://api.exchange.coinbase.com/products');

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    const tokens = data
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

    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
    console.log(`Successfully generated tokens.json with ${tokens.length} pairs.`);

  } catch (error) {
    console.error('Error generating tokens file:', error);
  }
}

generateTokens();
