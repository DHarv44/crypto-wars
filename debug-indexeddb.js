// Paste this into your browser console to check IndexedDB contents

(async function() {
  console.log('=== Checking IndexedDB ===');

  // Check CryptoWarsTSDB (time series data)
  const tsdbRequest = indexedDB.open('CryptoWarsTSDB');

  tsdbRequest.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['timeseries'], 'readonly');
    const store = transaction.objectStore('timeseries');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = function() {
      const results = getAllRequest.result;
      console.log(`Found ${results.length} time series entries in TSDB:`);

      results.forEach(entry => {
        console.log(`  - ${entry.key}`);
      });

      if (results.length === 0) {
        console.log('❌ NO TIME SERIES DATA FOUND - This is the problem!');
      } else {
        console.log('✅ Time series data exists');
        console.log('Sample entry:', results[0]);
      }
    };
  };

  tsdbRequest.onerror = function() {
    console.log('❌ CryptoWarsTSDB does not exist');
  };

  // Check CryptoWarsDB (game state)
  const gameDbRequest = indexedDB.open('CryptoWarsDB');

  gameDbRequest.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    const profileIdRequest = store.get('activeProfileId');
    profileIdRequest.onsuccess = function() {
      console.log('Active Profile ID in cache:', profileIdRequest.result);
    };
  };

  gameDbRequest.onerror = function() {
    console.log('❌ CryptoWarsDB does not exist');
  };
})();
