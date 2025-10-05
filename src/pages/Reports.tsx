import { Container, Title, Text, Stack, Paper, Grid, Group, Progress, Badge, Divider } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatNumber, formatPercent } from '../utils/format';
import { useMemo } from 'react';

export default function Reports() {
  const { tick, cashUSD, netWorthUSD, holdings, assets, reputation, influence, security, scrutiny, exposure } =
    useStore();

  // Calculate portfolio stats
  const portfolioStats = useMemo(() => {
    const totalHoldings = Object.entries(holdings).reduce((sum, [assetId, units]) => {
      const asset = assets[assetId];
      return sum + (asset ? units * asset.price : 0);
    }, 0);

    const initialCash = 100000;
    const totalProfit = netWorthUSD - initialCash;
    const roi = (totalProfit / initialCash) * 100;

    const assetCount = Object.values(holdings).filter((u) => u > 0).length;

    // Find biggest winner
    let biggestWinner = { symbol: 'N/A', profit: 0 };
    for (const [assetId, units] of Object.entries(holdings)) {
      if (units === 0) continue;
      const asset = assets[assetId];
      if (!asset) continue;
      const currentValue = units * asset.price;
      const buyPrice = asset.basePrice; // Simplified
      const buyValue = units * buyPrice;
      const profit = currentValue - buyValue;
      if (profit > biggestWinner.profit) {
        biggestWinner = { symbol: asset.symbol, profit };
      }
    }

    return {
      totalHoldings,
      totalProfit,
      roi,
      assetCount,
      biggestWinner,
    };
  }, [holdings, assets, netWorthUSD]);

  // Risk analysis
  const riskAnalysis = useMemo(() => {
    const ruggedAssets = Object.values(assets).filter((a) => {
      const units = holdings[a.id] || 0;
      return units > 0 && a.rugged;
    });

    const highRiskAssets = Object.values(assets).filter((a) => {
      const units = holdings[a.id] || 0;
      return units > 0 && !a.rugged && a.auditScore < 0.3;
    });

    return {
      ruggedCount: ruggedAssets.length,
      highRiskCount: highRiskAssets.length,
    };
  }, [assets, holdings]);

  // Time stats
  const timeStats = {
    daysPlayed: tick,
    avgProfitPerDay: tick > 0 ? portfolioStats.totalProfit / tick : 0,
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} c="terminal.5">
            REPORTS
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Performance analysis and statistics
          </Text>
        </div>

        {/* Performance Overview */}
        <Paper p="md" withBorder>
          <Title order={3} c="terminal.5" mb="md">
            PERFORMANCE OVERVIEW
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="sm" bg="dark.8">
                <Text size="xs" c="dimmed" tt="uppercase" mb={4}>
                  Total Profit/Loss
                </Text>
                <Text
                  size="xl"
                  fw={700}
                  ff="monospace"
                  c={portfolioStats.totalProfit >= 0 ? 'darkGreen.5' : 'darkRed.5'}
                >
                  {formatUSD(portfolioStats.totalProfit, 0)}
                </Text>
                <Progress
                  value={Math.min(100, Math.abs(portfolioStats.roi))}
                  color={portfolioStats.totalProfit >= 0 ? 'darkGreen' : 'darkRed'}
                  size="sm"
                  mt="xs"
                />
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="sm" bg="dark.8">
                <Text size="xs" c="dimmed" tt="uppercase" mb={4}>
                  ROI
                </Text>
                <Text size="xl" fw={700} ff="monospace" c={portfolioStats.roi >= 0 ? 'darkGreen.5' : 'darkRed.5'}>
                  {formatPercent(portfolioStats.roi / 100)}
                </Text>
                <Badge size="sm" color={portfolioStats.roi >= 0 ? 'green' : 'red'} variant="light" mt="xs">
                  {portfolioStats.roi >= 0 ? 'Profitable' : 'Loss'}
                </Badge>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="sm" bg="dark.8">
                <Text size="xs" c="dimmed" tt="uppercase" mb={4}>
                  Avg Profit/Day
                </Text>
                <Text size="xl" fw={700} ff="monospace">
                  {formatUSD(timeStats.avgProfitPerDay, 0)}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Over {timeStats.daysPlayed} days
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper p="sm" bg="dark.8">
                <Text size="xs" c="dimmed" tt="uppercase" mb={4}>
                  Assets Held
                </Text>
                <Text size="xl" fw={700} ff="monospace">
                  {portfolioStats.assetCount}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Active positions
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Portfolio Breakdown */}
        <Paper p="md" withBorder>
          <Title order={3} c="terminal.5" mb="md">
            PORTFOLIO BREAKDOWN
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Cash
                </Text>
                <Text size="sm" fw={700} ff="monospace">
                  {formatUSD(cashUSD, 0)}
                </Text>
              </Group>
              <Progress value={(cashUSD / netWorthUSD) * 100} color="blue" size="lg" mb="md" />

              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Holdings
                </Text>
                <Text size="sm" fw={700} ff="monospace">
                  {formatUSD(portfolioStats.totalHoldings, 0)}
                </Text>
              </Group>
              <Progress value={(portfolioStats.totalHoldings / netWorthUSD) * 100} color="terminal.5" size="lg" />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="sm" bg="dark.8">
                <Text size="sm" fw={700} mb="xs">
                  Biggest Winner
                </Text>
                <Group justify="space-between">
                  <Badge size="lg" color="green" variant="light" ff="monospace">
                    {portfolioStats.biggestWinner.symbol}
                  </Badge>
                  <Text size="lg" fw={700} c="darkGreen.5" ff="monospace">
                    +{formatUSD(portfolioStats.biggestWinner.profit, 0)}
                  </Text>
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Risk Analysis */}
        <Paper p="md" withBorder>
          <Title order={3} c="terminal.5" mb="md">
            RISK ANALYSIS
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm">Rugged Assets</Text>
                  <Badge size="lg" color="red" variant="light">
                    {riskAnalysis.ruggedCount}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">High Risk Holdings</Text>
                  <Badge size="lg" color="yellow" variant="light">
                    {riskAnalysis.highRiskCount}
                  </Badge>
                </Group>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="xs" c="dimmed" mb="xs" tt="uppercase">
                Player Stats
              </Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm">Reputation</Text>
                  <Text size="sm" fw={700} ff="monospace">
                    {formatNumber(reputation)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Influence</Text>
                  <Text size="sm" fw={700} ff="monospace">
                    {formatNumber(influence)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Security</Text>
                  <Text size="sm" fw={700} ff="monospace">
                    {formatNumber(security)}
                  </Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" c="yellow">
                    Scrutiny
                  </Text>
                  <Text size="sm" fw={700} ff="monospace" c={scrutiny > 70 ? 'red' : 'yellow'}>
                    {formatNumber(scrutiny)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="red">
                    Exposure
                  </Text>
                  <Text size="sm" fw={700} ff="monospace" c="red">
                    {formatNumber(exposure)}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Session Info */}
        <Paper p="md" withBorder>
          <Title order={4} c="terminal.5" mb="md">
            SESSION INFO
          </Title>
          <Grid>
            <Grid.Col span={4}>
              <Text size="xs" c="dimmed" tt="uppercase">
                Days Played
              </Text>
              <Text size="lg" fw={700} ff="monospace">
                {tick}
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="xs" c="dimmed" tt="uppercase">
                Starting Capital
              </Text>
              <Text size="lg" fw={700} ff="monospace">
                {formatUSD(100000, 0)}
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="xs" c="dimmed" tt="uppercase">
                Net Worth
              </Text>
              <Text size="lg" fw={700} ff="monospace" c="terminal.5">
                {formatUSD(netWorthUSD, 0)}
              </Text>
            </Grid.Col>
          </Grid>
        </Paper>
      </Stack>
    </Container>
  );
}
