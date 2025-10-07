import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[StorageCache]') || text.includes('[loadGameState]') || text.includes('[initGame]') || text.includes('[setCachedSessionGame]')) {
      console.log('BROWSER:', text);
    }
  });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  console.log('\nWaiting for page to load...');
  await new Promise(r => setTimeout(r, 2000));

  // Check if onboarding is needed
  const pageText = await page.evaluate(() => document.body.textContent);
  const needsOnboarding = pageText.includes('CRYPTO WARS') || pageText.includes('Send It');

  if (needsOnboarding) {
    console.log('\nOnboarding detected, clicking through...');

    // Click "Send It" button
    try {
      await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Send It'));
      }, { timeout: 3000 });

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendIt = buttons.find(btn => btn.textContent.includes('Send It'));
        if (sendIt) sendIt.click();
      });
      console.log('Clicked "Send It"');
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log('No "Send It" button - might be past cold open');
    }

    // Enter handle
    try {
      await page.waitForSelector('input', { timeout: 3000 });
      await page.click('input');
      await page.keyboard.type('TestPlayer', { delay: 50 });
      console.log('Entered handle "TestPlayer"');
      await new Promise(r => setTimeout(r, 500));

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(btn => btn.textContent.includes('Next'));
        if (nextBtn) nextBtn.click();
      });
      console.log('Clicked Next');
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log('Handle input step failed');
    }

    // Select archetype
    try {
      await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => btn.textContent.includes('Degen') || btn.textContent.includes('Whale'));
      }, { timeout: 3000 });

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const archetype = buttons.find(btn => btn.textContent.includes('Degen') || btn.textContent.includes('Whale') || btn.textContent.includes('Builder'));
        if (archetype) archetype.click();
      });
      console.log('Selected archetype');
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log('Archetype selection failed');
    }

    // Select vibe
    try {
      await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => btn.textContent.includes('pump') || btn.textContent.includes('fud'));
      }, { timeout: 3000 });

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const vibe = buttons.find(btn => btn.textContent.includes('pump') || btn.textContent.includes('fud') || btn.textContent.includes('investigative'));
        if (vibe) vibe.click();
      });
      console.log('Selected vibe, waiting for backfill...');
      await new Promise(r => setTimeout(r, 6000)); // Wait for backfill
    } catch (e) {
      console.log('Vibe selection failed');
    }
  } else {
    console.log('\nNo onboarding needed, already has player');
  }

  console.log('\nWaiting for dashboard to load...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('\nNavigating to /market...');
  await page.goto('http://localhost:5173/market', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('\nRefreshing page...');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('\nChecking IndexedDB for sessionGame...');
  const dbInfo = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('crypto-wars-db', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const result = await new Promise((resolve) => {
      const request = store.get('sessionGame');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    return {
      found: !!result,
      hasValue: !!result?.value,
      hasGameState: !!result?.value?.gameState,
      assetsCount: result?.value?.gameState?.assets ? Object.keys(result.value.gameState.assets).length : 0
    };
  });

  console.log('\nIndexedDB sessionGame:', JSON.stringify(dbInfo, null, 2));

  console.log('\n=== DONE ===');
  console.log('Browser will stay open. Check the Market page - is the table populated?');

  //await browser.close();
})();
