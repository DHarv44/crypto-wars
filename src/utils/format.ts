/**
 * Format utilities for numbers, currencies, and dates
 */

// Precision constants for crypto units (supports down to 1 satoshi / smallest shitcoin)
export const UNIT_PRECISION = 8; // 8 decimal places (Bitcoin satoshi precision)
export const UNIT_STEP = 0.00000001; // Smallest increment for selling units
export const DUST_THRESHOLD = 1e-8; // Minimum units to consider as "holding" (filters out floating point errors)

// Price floor - nothing can go cheaper than $0.00001
export const MIN_PRICE = 0.00001;

// Trading fee (flat $8 per trade)
export const TRADING_FEE = 8;

export function formatUSD(value: number, decimals = 2): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUnits(value: number, decimals = UNIT_PRECISION): string {
  return value.toFixed(decimals);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return formatUSD(value);
}

export function formatTick(tick: number): string {
  return `Day ${tick}`;
}

export function clampStat(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function getChangeColor(change: number): string {
  if (change > 0) return 'darkGreen';
  if (change < 0) return 'darkRed';
  return 'gray';
}

export function getRiskColor(risk: number): string {
  if (risk < 0.1) return 'green';
  if (risk < 0.3) return 'yellow';
  return 'red';
}
