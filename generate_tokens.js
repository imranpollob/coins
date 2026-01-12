const fs = require('fs');

try {
  const rawData = fs.readFileSync('AssetPairs.json');
  const data = JSON.parse(rawData);

  if (!data.result) {
    throw new Error('Invalid AssetPairs.json format');
  }

  const tokens = Object.values(data.result)
    .filter(pair => pair.wsname && pair.wsname.endsWith('/USD')) // Only USD pairs
    .map(pair => ({
      symbol: pair.wsname, // e.g. XBT/USD
      id: pair.altname,    // e.g. XBTUSD
      display: pair.wsname // e.g. XBT/USD
    }))
    // Sort alphabetically by display name
    .sort((a, b) => a.display.localeCompare(b.display));

  fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
  console.log(`Successfully generated tokens.json with ${tokens.length} pairs.`);

} catch (error) {
  console.error('Error generating tokens file:', error);
}
