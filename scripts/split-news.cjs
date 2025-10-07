const fs = require('fs');

const all = JSON.parse(fs.readFileSync('src/engine/news.seed.json', 'utf8'));

const bullish = all.filter(n => n.sentiment === 'bullish' && !n.isFake);
const bearish = all.filter(n => n.sentiment === 'bearish' && !n.isFake);
const neutral = all.filter(n => n.sentiment === 'neutral');
const fake = all.filter(n => n.isFake);

fs.writeFileSync('src/engine/news.bullish.json', JSON.stringify(bullish, null, 2));
fs.writeFileSync('src/engine/news.bearish.json', JSON.stringify(bearish, null, 2));
fs.writeFileSync('src/engine/news.neutral.json', JSON.stringify(neutral, null, 2));
fs.writeFileSync('src/engine/news.fake.json', JSON.stringify(fake, null, 2));

console.log('Split into files:');
console.log('Bullish:', bullish.length);
console.log('Bearish:', bearish.length);
console.log('Neutral:', neutral.length);
console.log('Fake:', fake.length);
console.log('Total:', all.length);
