import { Paper, Text, Stack, Group, Badge, ScrollArea, Table } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatNumber } from '../utils/format';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RecentTrades() {
  const navigate = useNavigate();
  const { getRecentTrades } = useStore();
  const recentTrades = getRecentTrades(10);

  if (recentTrades.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="md">
          Recent Trades
        </Text>
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No trades yet. Start trading to see your history here!
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="md">
        Recent Trades
      </Text>

      <ScrollArea h={250}>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Type</Table.Th>
              <Table.Th>Asset</Table.Th>
              <Table.Th>Units</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>P&L</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentTrades.map((trade) => (
              <Table.Tr key={trade.id}>
                <Table.Td>
                  <Badge
                    size="sm"
                    color={trade.type === 'buy' ? 'blue' : 'orange'}
                    variant="light"
                    leftSection={
                      trade.type === 'buy' ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )
                    }
                  >
                    {trade.type.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text
                    size="sm"
                    ff="monospace"
                    fw={600}
                    c="terminal.5"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/symbol/${trade.assetSymbol}`)}
                  >
                    {trade.assetSymbol}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {formatNumber(trade.units, 4)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {formatUSD(trade.pricePerUnit, 4)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace" fw={600}>
                    {formatUSD(trade.totalUSD, 2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {trade.realizedPnL !== undefined ? (
                    <Text
                      size="sm"
                      ff="monospace"
                      fw={600}
                      c={trade.realizedPnL > 0 ? 'teal' : trade.realizedPnL < 0 ? 'red' : 'gray'}
                    >
                      {trade.realizedPnL > 0 ? '+' : ''}
                      {formatUSD(trade.realizedPnL, 2)}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      -
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
