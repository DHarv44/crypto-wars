import { Paper, Table, Text, Badge, Button, Group } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatNumber } from '../utils/format';

export default function PortfolioTable() {
  const { getPortfolioTable, assets, openBuySellModal } = useStore();
  const portfolio = getPortfolioTable(assets);

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
        Portfolio
      </Text>
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Asset</Table.Th>
            <Table.Th>Units</Table.Th>
            <Table.Th>Value</Table.Th>
            <Table.Th>% of Portfolio</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {portfolio.map((entry) => (
            <Table.Tr key={entry.assetId}>
              <Table.Td>
                <Text size="sm" fw={700} c="terminal.5" ff="monospace">
                  {entry.symbol}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {formatNumber(entry.units, 4)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {formatUSD(entry.valueUSD, 2)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  size="sm"
                  color={entry.pctOfTotal > 50 ? 'red' : entry.pctOfTotal > 30 ? 'yellow' : 'green'}
                  variant="light"
                >
                  {entry.pctOfTotal.toFixed(1)}%
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end">
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    onClick={() => openBuySellModal(entry.assetId, 'buy')}
                  >
                    Buy
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    onClick={() => openBuySellModal(entry.assetId, 'sell')}
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
