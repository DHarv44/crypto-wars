import { Container, Title, Grid, Paper, Stack, Text, Group, Button, Badge } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../stores/rootStore';
import AssetChart from '../components/AssetChart';
import RiskMeter from '../components/RiskMeter';
import BuySellModal from '../features/trading/BuySellModal';
import { formatUSD, formatPercent, getChangeColor } from '../utils/format';
import { useMemo } from 'react';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assets, holdings, openBuySellModal } = useStore();

  const asset = id ? assets[id] : null;
  const currentHoldings = id ? holdings[id] || 0 : 0;

  const change24h = useMemo(() => {
    if (!asset || !asset.priceHistory || asset.priceHistory.length === 0) return 0;
    const history = asset.priceHistory;
    const oldPrice = history.length > 5 ? history[history.length - 6].close : asset.basePrice;
    return ((asset.price - oldPrice) / oldPrice) * 100;
  }, [asset]);

  if (!asset) {
    return (
      <Container size="xl" py="xl">
        <Title order={1} c="red">
          Asset Not Found
        </Title>
        <Text c="dimmed" mt="md">
          The asset with ID "{id}" does not exist.
        </Text>
        <Button mt="lg" onClick={() => navigate('/market')}>
          Back to Market
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} c="terminal.5">
              {asset.symbol}
            </Title>
            <Text size="lg" c="dimmed">
              {asset.name}
            </Text>
          </div>
          <Group>
            <Button color="green" onClick={() => openBuySellModal(asset.id, 'buy')}>
              Buy {asset.symbol}
            </Button>
            <Button
              color="red"
              onClick={() => openBuySellModal(asset.id, 'sell')}
              disabled={currentHoldings === 0}
            >
              Sell {asset.symbol}
            </Button>
          </Group>
        </Group>

        {/* Price Info */}
        <Paper p="md" withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Current Price
                </Text>
                <Text size="xl" fw={700} ff="monospace" c="terminal.5">
                  {formatUSD(asset.price, asset.price < 1 ? 6 : 2)}
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  24h Change
                </Text>
                <Text size="xl" fw={700} ff="monospace" c={getChangeColor(change24h)}>
                  {formatPercent(change24h)}
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Your Holdings
                </Text>
                <Text size="xl" fw={700} ff="monospace">
                  {currentHoldings.toFixed(4)}
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Holdings Value
                </Text>
                <Text size="xl" fw={700} ff="monospace" c="terminal.5">
                  {formatUSD(currentHoldings * asset.price, 2)}
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Chart and Risk Meter */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <AssetChart assetId={asset.id} assetName={asset.name} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <RiskMeter asset={asset} />
          </Grid.Col>
        </Grid>

        {/* Asset Details */}
        <Paper p="md" withBorder>
          <Text size="sm" fw={700} mb="md" c="terminal.5" tt="uppercase">
            Asset Information
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Base Price
                </Text>
                <Text size="sm" ff="monospace">
                  {formatUSD(asset.basePrice, asset.basePrice < 1 ? 6 : 2)}
                </Text>
              </Group>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Liquidity
                </Text>
                <Text size="sm" ff="monospace">
                  {formatUSD(asset.liquidityUSD, 0)}
                </Text>
              </Group>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Base Volatility
                </Text>
                <Text size="sm" ff="monospace">
                  {(asset.baseVolatility * 100).toFixed(1)}%
                </Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Gov Favor Score
                </Text>
                <Badge
                  size="sm"
                  color={asset.govFavorScore > 0.5 ? 'green' : asset.govFavorScore > 0.3 ? 'yellow' : 'red'}
                  variant="light"
                >
                  {(asset.govFavorScore * 100).toFixed(0)}%
                </Badge>
              </Group>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Player Token
                </Text>
                <Badge size="sm" color={asset.isPlayerToken ? 'blue' : 'gray'} variant="light">
                  {asset.isPlayerToken ? 'Yes' : 'No'}
                </Badge>
              </Group>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Status
                </Text>
                <Badge
                  size="sm"
                  color={asset.rugged ? 'red' : asset.flagged ? 'orange' : 'green'}
                  variant="light"
                >
                  {asset.rugged ? 'Rugged' : asset.flagged ? 'Flagged' : 'Active'}
                </Badge>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>
      </Stack>

      <BuySellModal />
    </Container>
  );
}
