import { Paper, Table, Text, Group, Badge, ActionIcon } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatUnits } from '../utils/format';
import { IconX } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export default function LimitOrdersTable() {
  const { limitOrders, cancelLimitOrder, assets } = useStore();

  const pendingOrders = limitOrders.filter(order => order.status === 'pending');

  if (pendingOrders.length === 0) return null;

  return (
    <Paper p="md" withBorder>
      <Text size="sm" fw={700} mb="sm" c="terminal.5" tt="uppercase">
        Active Limit Orders
      </Text>

      <Table highlightOnHover verticalSpacing={4} striped style={{ fontSize: '0.8rem' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ fontSize: '0.75rem' }}>Coin</Table.Th>
            <Table.Th style={{ fontSize: '0.75rem' }}>Type</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Current Price</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Trigger Price</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Amount</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Created</Table.Th>
            <Table.Th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Action</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {pendingOrders.map((order) => {
            const asset = assets[order.assetId];
            return (
              <Table.Tr key={order.id}>
                <Table.Td>
                  <Link to={`/market/${order.assetId}`} style={{ textDecoration: 'none' }}>
                    <Text size="xs" fw={700} c="terminal.5" ff="monospace" style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      {order.assetSymbol}
                    </Text>
                  </Link>
                </Table.Td>
                <Table.Td>
                  <Badge color={order.type === 'buy' ? 'green' : 'red'} size="xs" variant="light">
                    {order.type.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text size="xs" ff="monospace">
                    {asset ? formatUSD(asset.price, asset.price < 1 ? 6 : 2) : '-'}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text size="xs" ff="monospace">
                    {formatUSD(order.triggerPrice, asset && asset.price < 1 ? 6 : 2)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text size="xs" ff="monospace">
                    {order.type === 'buy'
                      ? formatUSD(order.amount, 2)
                      : `${formatUnits(order.amount)} ${order.assetSymbol}`
                    }
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text size="xs" c="dimmed">
                    Day {order.createdDay}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => cancelLimitOrder(order.id)}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
