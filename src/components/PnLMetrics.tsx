import { Paper, Group, Stack, Text, Badge, SimpleGrid, Tooltip } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatNumber } from '../utils/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PnLMetrics() {
  const { assets, cashUSD, netWorthUSD, getUnrealizedPnL, getTotalPnL, realizedPnL, getROI, getWinLossRatio, getBestWorstPerformers } = useStore();

  // Get current prices
  const prices: Record<string, number> = {};
  for (const id in assets) {
    prices[id] = assets[id].price;
  }

  const unrealizedPnL = getUnrealizedPnL(prices);
  const totalPnL = getTotalPnL(prices);
  const roi = getROI();
  const { wins, losses, ratio } = getWinLossRatio();
  const { best, worst } = getBestWorstPerformers(prices);

  const getColorForPnL = (value: number) => {
    if (value > 0) return 'teal';
    if (value < 0) return 'red';
    return 'gray';
  };

  const getSignPrefix = (value: number) => (value > 0 ? '+' : '');

  return (
    <Paper p="md" withBorder>
      <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
        P&L & Performance
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 3, md: 7 }} spacing="lg">
        {/* Total P&L */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Total P&L
          </Text>
          <Tooltip label="Realized + Unrealized P&L">
            <Text size="lg" fw={700} c={getColorForPnL(totalPnL)} ff="monospace">
              {getSignPrefix(totalPnL)}
              {formatUSD(totalPnL, 0)}
            </Text>
          </Tooltip>
        </Stack>

        {/* Realized P&L */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Realized
          </Text>
          <Tooltip label="P&L from closed positions">
            <Text size="lg" fw={700} c={getColorForPnL(realizedPnL)} ff="monospace">
              {getSignPrefix(realizedPnL)}
              {formatUSD(realizedPnL, 0)}
            </Text>
          </Tooltip>
        </Stack>

        {/* Unrealized P&L */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Unrealized
          </Text>
          <Tooltip label="P&L from open positions">
            <Text size="lg" fw={700} c={getColorForPnL(unrealizedPnL)} ff="monospace">
              {getSignPrefix(unrealizedPnL)}
              {formatUSD(unrealizedPnL, 0)}
            </Text>
          </Tooltip>
        </Stack>

        {/* ROI */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            ROI
          </Text>
          <Tooltip label="Return on Investment">
            <Text size="lg" fw={700} c={getColorForPnL(roi)} ff="monospace">
              {getSignPrefix(roi)}
              {formatNumber(roi, 1)}%
            </Text>
          </Tooltip>
        </Stack>

        {/* Win/Loss Ratio */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Win/Loss
          </Text>
          <Tooltip label={`${wins} wins, ${losses} losses`}>
            <Group gap={4}>
              <Text size="lg" fw={700} c="terminal.5" ff="monospace">
                {wins}/{losses}
              </Text>
              <Badge size="sm" color={ratio > 1 ? 'teal' : ratio < 1 ? 'red' : 'gray'} variant="light">
                {ratio === Infinity ? '∞' : formatNumber(ratio, 2)}
              </Badge>
            </Group>
          </Tooltip>
        </Stack>

        {/* Cash */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Cash
          </Text>
          <Text size="lg" fw={700} c="terminal.5" ff="monospace">
            {formatUSD(cashUSD, 0)}
          </Text>
        </Stack>

        {/* Net Worth */}
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Net Worth
          </Text>
          <Tooltip label="Cash + Holdings">
            <Text size="lg" fw={700} c="terminal.5" ff="monospace">
              {formatUSD(netWorthUSD, 0)}
            </Text>
          </Tooltip>
        </Stack>
      </SimpleGrid>

      {/* Best/Worst Performers */}
      {(best.length > 0 || worst.length > 0) && (
        <Group mt="md" gap="xl" grow>
          {best.length > 0 && (
            <Stack gap={4}>
              <Group gap={4}>
                <TrendingUp size={14} color="var(--mantine-color-teal-6)" />
                <Text size="xs" c="dimmed" fw={600}>
                  Top Performers
                </Text>
              </Group>
              {best.slice(0, 2).map((p) => (
                <Group key={p.assetId} justify="space-between">
                  <Text size="xs" c="terminal.5" ff="monospace">
                    {p.symbol}
                  </Text>
                  <Badge size="xs" color="teal" variant="light">
                    +{formatNumber(p.pnlPct, 1)}%
                  </Badge>
                </Group>
              ))}
            </Stack>
          )}

          {worst.length > 0 && (
            <Stack gap={4}>
              <Group gap={4}>
                <TrendingDown size={14} color="var(--mantine-color-red-6)" />
                <Text size="xs" c="dimmed" fw={600}>
                  Worst Performers
                </Text>
              </Group>
              {worst.slice(0, 2).map((p) => (
                <Group key={p.assetId} justify="space-between">
                  <Text size="xs" c="terminal.5" ff="monospace">
                    {p.symbol}
                  </Text>
                  <Badge size="xs" color="red" variant="light">
                    {formatNumber(p.pnlPct, 1)}%
                  </Badge>
                </Group>
              ))}
            </Stack>
          )}
        </Group>
      )}
    </Paper>
  );
}
