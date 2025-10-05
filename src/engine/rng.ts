// Seeded RNG using mulberry32 for deterministic replays

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Returns [0, 1)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns integer [min, max]
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Box-Muller transform for normal distribution
  normal(mean = 0, stdDev = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Chance check (p ∈ [0, 1])
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  // Pick random element from array
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  // Get current seed state (for save/load)
  getState(): number {
    return this.state;
  }

  // Restore seed state
  setState(state: number): void {
    this.state = state;
  }
}

// Global RNG instance (initialized in engine slice)
export let globalRNG: SeededRNG;

export function initRNG(seed?: number): SeededRNG {
  const finalSeed = seed ?? Date.now();
  globalRNG = new SeededRNG(finalSeed);
  return globalRNG;
}

export function getRNG(): SeededRNG {
  if (!globalRNG) {
    initRNG();
  }
  return globalRNG;
}
