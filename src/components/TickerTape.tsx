import { Paper, Group, Text } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatPercent, getChangeColor } from '../utils/format';
import { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const TickerItem = memo(({ ticker, onClick }: { ticker: any; onClick: () => void }) => (
  <Group
    gap="xs"
    style={{
      whiteSpace: 'nowrap',
      flexShrink: 0,
      cursor: 'pointer',
    }}
    onClick={onClick}
  >
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
));

export default function TickerTape() {
  const { assets, list } = useStore();
  const navigate = useNavigate();

  const tickers = useMemo(() => {
    return list
      .map((id) => assets[id])
      .filter((a) => a && !a.rugged)
      .slice(0, 10) // Show top 10
      .map((asset) => {
        // Use today's history for intraday change
        const todayHistory = asset.priceHistory?.today || [];

        let change = 0;
        if (todayHistory.length > 0) {
          // Calculate change from start of today
          const startPrice = todayHistory[0]?.open || asset.price;
          change = startPrice > 0 ? ((asset.price - startPrice) / startPrice) * 100 : 0;
        }
        // If no today history, show 0% (market just opened, no change yet)

        return {
          id: asset.id,
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
          animation: 'tickerScroll 21s linear infinite',
          willChange: 'transform',
        }}
      >
        {/* Duplicate for seamless loop */}
        {[...tickers, ...tickers].map((ticker, idx) => (
          <TickerItem
            key={`${ticker.id}-${idx}`}
            ticker={ticker}
            onClick={() => navigate(`/symbol/${ticker.symbol}`)}
          />
        ))}
      </div>
      <style>{`
        @keyframes tickerScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </Paper>
  );
}
