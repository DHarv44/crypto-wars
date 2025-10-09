/**
 * CLI runner for simulation tests
 *
 * Usage:
 *   npx tsx src/testing/runSimulation.ts
 *   npx tsx src/testing/runSimulation.ts --days 500 --seed 42 --verbose
 */

import { runSimulation, printMetrics } from './simulator';

// Parse command line args
const args = process.argv.slice(2);
const config = {
  days: 100,
  seed: undefined as number | undefined,
  logEvents: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--days':
    case '-d':
      config.days = parseInt(args[++i], 10);
      break;
    case '--seed':
    case '-s':
      config.seed = parseInt(args[++i], 10);
      break;
    case '--verbose':
    case '-v':
      config.logEvents = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: npx tsx src/testing/runSimulation.ts [options]

Options:
  -d, --days <number>     Number of days to simulate (default: 100)
  -s, --seed <number>     RNG seed for reproducibility (optional)
  -v, --verbose           Log individual events during simulation
  -h, --help              Show this help message

Examples:
  npx tsx src/testing/runSimulation.ts
  npx tsx src/testing/runSimulation.ts --days 500 --seed 42
  npx tsx src/testing/runSimulation.ts -d 1000 -v
      `);
      process.exit(0);
  }
}

console.log('🎮 Running Crypto Wars Balance Simulation...\n');
console.log(`Configuration:`);
console.log(`  Days: ${config.days}`);
console.log(`  Seed: ${config.seed ?? 'random'}`);
console.log(`  Verbose: ${config.logEvents}`);

const startTime = Date.now();
const metrics = runSimulation(config);
const duration = Date.now() - startTime;

printMetrics(metrics);

console.log(`⏱️  Simulation completed in ${duration}ms`);
console.log(`   (${(config.days / (duration / 1000)).toFixed(0)} days/second)\n`);
