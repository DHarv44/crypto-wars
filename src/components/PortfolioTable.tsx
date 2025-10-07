import { Paper, Table, Text, Badge, Button, Group } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatUnits, DUST_THRESHOLD } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function PortfolioTable() {
  const { getPortfolioTable, assets, openBuySellModal, cashUSD } = useStore();
  const allPortfolio = getPortfolioTable(assets);
  // Filter out dust positions (effectively zero units)
  const portfolio = allPortfolio.filter(entry => entry.units >= DUST_THRESHOLD);
  const navigate = useNavigate();

  if (portfolio.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" fw={700} mb="sm" c="terminal.5" tt="uppercase">
          Portfolio
        </Text>
        <Text size="sm" c="dimmed" fs="italic">
          No holdings yet. Start trading!
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Text size="sm" fw={700} mb="sm" c="terminal.5" tt="uppercase">
        Portfolio Holdings
      </Text>
      <Table highlightOnHover verticalSpacing={4} striped style={{ fontSize: '0.8rem' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ fontSize: '0.75rem' }}>Coin</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Units</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Cost Basis</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Current Price</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Market Value</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>P&L</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>% Gain/Loss</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>% of Portfolio</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {portfolio.map((entry) => (
            <Table.Tr key={entry.assetId}>
              <Table.Td>
                <Text
                  size="xs"
                  fw={700}
                  c="terminal.5"
                  ff="monospace"
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate(`/symbol/${entry.symbol}`)}
                >
                  {entry.symbol}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text size="xs" ff="monospace">
                  {formatUnits(entry.units)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text size="xs" ff="monospace">
                  {formatUSD(entry.costBasisUSD, 2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text size="xs" ff="monospace">
                  {formatUSD(entry.currentPrice, 2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text size="xs" ff="monospace" fw={600}>
                  {formatUSD(entry.valueUSD, 2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text
                  size="xs"
                  ff="monospace"
                  c={entry.unrealizedPnL >= 0 ? 'green' : 'red'}
                  fw={600}
                >
                  {entry.unrealizedPnL >= 0 ? '+' : ''}{formatUSD(entry.unrealizedPnL, 2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Badge
                  size="xs"
                  color={entry.unrealizedPnLPct >= 0 ? 'green' : 'red'}
                  variant="light"
                >
                  {entry.unrealizedPnLPct >= 0 ? '+' : ''}{entry.unrealizedPnLPct.toFixed(2)}%
                </Badge>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Badge
                  size="xs"
                  color={entry.pctOfTotal > 50 ? 'red' : entry.pctOfTotal > 30 ? 'yellow' : 'gray'}
                  variant="light"
                >
                  {entry.pctOfTotal.toFixed(1)}%
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="flex-end">
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="green"
                    onClick={() => openBuySellModal(entry.assetId, 'buy')}
                    disabled={cashUSD <= 0}
                  >
                    Buy
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="red"
                    onClick={() => openBuySellModal(entry.assetId, 'sell')}
                    disabled={entry.units <= 0}
                  >
                    Sell
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
