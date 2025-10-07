// Script to check what's actually in IndexedDB
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Opening app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 2000));

  console.log('\n=== CHECKING INDEXEDDB ===');

  const dbContents = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('crypto-wars-db', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Get all from settings store
    const settingsTransaction = db.transaction('settings', 'readonly');
    const settingsStore = settingsTransaction.objectStore('settings');
    const settingsData = await new Promise((resolve) => {
      const request = settingsStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });

    // Get all from games store
    const gamesTransaction = db.transaction('games', 'readonly');
    const gamesStore = gamesTransaction.objectStore('games');
    const gamesData = await new Promise((resolve) => {
      const request = gamesStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });

    return {
      settings: settingsData.map(s => ({
        key: s.key,
        hasValue: !!s.value,
        valueType: typeof s.value,
        hasGameState: s.key === 'sessionGame' ? !!s.value?.gameState : 'N/A',
        assetsCount: s.key === 'sessionGame' && s.value?.gameState?.assets ? Object.keys(s.value.gameState.assets).length : 'N/A'
      })),
      games: gamesData.map(g => ({
        profileId: g.playerProfile?.id,
        hasGameState: !!g.gameState,
        assetsCount: g.gameState?.assets ? Object.keys(g.gameState.assets).length : 'N/A',
        listLength: g.gameState?.list ? g.gameState.list.length : 'N/A'
      }))
    };
  });

  console.log('\n--- SETTINGS STORE ---');
  console.log(JSON.stringify(dbContents.settings, null, 2));

  console.log('\n--- GAMES STORE ---');
  console.log(JSON.stringify(dbContents.games, null, 2));

  await browser.close();
})();
