import { Paper, Group, Text } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatPercent, getChangeColor } from '../utils/format';
import { useMemo } from 'react';

export default function TickerTape() {
  const { assets, list } = useStore();

  const tickers = useMemo(() => {
    return list
      .map((id) => assets[id])
      .filter((a) => a && !a.rugged)
      .slice(0, 10) // Show top 10
      .map((asset) => {
        const history = asset.priceHistory || [];
        const oldPrice = history.length > 0 ? history[Math.max(0, history.length - 5)]?.close || asset.basePrice : asset.basePrice;
        const change = ((asset.price - oldPrice) / oldPrice) * 100;

        return {
          symbol: asset.symbol,
          price: asset.price,
          change,
          color: getChangeColor(change),
        };
      });
  }, [assets, list]);

  return (
    <Paper p="xs" withBorder style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: '2rem',
          animation: 'scroll 30s linear infinite',
        }}
      >
        {/* Duplicate for seamless loop */}
        {[...tickers, ...tickers, ...tickers].map((ticker, idx) => (
          <Group key={idx} gap="xs" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Text size="sm" fw={700} c="terminal.5" ff="monospace">
              {ticker.symbol}
            </Text>
            <Text size="sm" c={ticker.color} ff="monospace">
              ${ticker.price.toFixed(ticker.price < 1 ? 6 : 2)}
            </Text>
            <Text size="sm" c={ticker.color} ff="monospace">
              {formatPercent(ticker.change)}
            </Text>
          </Group>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </Paper>
  );
}
