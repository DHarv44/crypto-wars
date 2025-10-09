import { Container, Title, Paper, Table, TextInput, Group, Select, Badge, Button, Text, Anchor } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatPercent, getRiskColor, getChangeColor } from '../utils/format';
import { useState, useMemo, useEffect } from 'react';
import { calculateRugProbability } from '../engine/risk';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import BuySellModal from '../features/trading/BuySellModal';
import { useNavigate } from 'react-router-dom';
import MarketForecast from '../components/MarketForecast';

type SortField = 'symbol' | 'price' | 'change' | 'rugRisk' | 'liquidity' | 'auditScore';
type SortDirection = 'asc' | 'desc';

export default function Market() {
  const { assets, list, filters, setFilter, openBuySellModal } = useStore();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = useMemo(() => {
    const filtered = list
      .map((id) => assets[id])
      .filter((asset) => {
        if (!asset) return false;
        if (asset.rugged) return false;

        // Search filter
        if (filters.search) {
          const search = filters.search.toLowerCase();
          if (!asset.symbol.toLowerCase().includes(search) && !asset.name.toLowerCase().includes(search)) {
            return false;
          }
        }

        // Audited filter
        if (filters.audited !== null) {
          if (filters.audited && asset.auditScore <= 0.5) return false;
          if (!filters.audited && asset.auditScore > 0.5) return false;
        }

        // Risk level filter
        if (filters.riskLevel !== 'all') {
          const rugProb = calculateRugProbability(asset);
          if (filters.riskLevel === 'low' && rugProb >= 0.1) return false;
          if (filters.riskLevel === 'medium' && (rugProb < 0.1 || rugProb >= 0.3)) return false;
          if (filters.riskLevel === 'high' && rugProb < 0.3) return false;
        }

        return true;
      });

    // Calculate changes and rug risk for sorting
    const withMetrics = filtered.map((asset) => {
      const history = asset.priceHistory || [];
      const oldPrice = history.length > 5 ? history[history.length - 6].close : asset.basePrice;
      const change = ((asset.price - oldPrice) / oldPrice) * 100;
      const rugProb = calculateRugProbability(asset);

      return { asset, change, rugProb };
    });

    // Sort
    withMetrics.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'symbol':
          comparison = a.asset.symbol.localeCompare(b.asset.symbol);
          break;
        case 'price':
          comparison = a.asset.price - b.asset.price;
          break;
        case 'change':
          comparison = a.change - b.change;
          break;
        case 'rugRisk':
          comparison = a.rugProb - b.rugProb;
          break;
        case 'liquidity':
          comparison = a.asset.liquidityUSD - b.asset.liquidityUSD;
          break;
        case 'auditScore':
          comparison = a.asset.auditScore - b.asset.auditScore;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return withMetrics;
  }, [assets, list, filters, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
  };

  return (
    <Container size="xl" py="xl">
      <Title order={1} c="terminal.5" mb="lg">
        MARKET
      </Title>

      <MarketForecast />

      <Paper p="md" withBorder mb="lg" mt="lg">
        <Group>
          <TextInput
            placeholder="Search symbol or name..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            placeholder="Risk Level"
            value={filters.riskLevel}
            onChange={(value) => setFilter('riskLevel', value)}
            data={[
              { value: 'all', label: 'All Risk Levels' },
              { value: 'low', label: 'Low Risk' },
              { value: 'medium', label: 'Medium Risk' },
              { value: 'high', label: 'High Risk' },
            ]}
            style={{ minWidth: 150 }}
          />
          <Select
            placeholder="Audit Status"
            value={filters.audited === null ? 'all' : filters.audited ? 'yes' : 'no'}
            onChange={(value) => {
              if (value === 'all') setFilter('audited', null);
              else if (value === 'yes') setFilter('audited', true);
              else setFilter('audited', false);
            }}
            data={[
              { value: 'all', label: 'All Assets' },
              { value: 'yes', label: 'Audited' },
              { value: 'no', label: 'Not Audited' },
            ]}
            style={{ minWidth: 150 }}
          />
        </Group>
      </Paper>

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th onClick={() => toggleSort('symbol')} style={{ cursor: 'pointer' }}>
                <Group gap={4}>
                  Symbol <SortIcon field="symbol" />
                </Group>
              </Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th onClick={() => toggleSort('price')} style={{ cursor: 'pointer' }}>
                <Group gap={4}>
                  Price <SortIcon field="price" />
                </Group>
              </Table.Th>
              <Table.Th onClick={() => toggleSort('change')} style={{ cursor: 'pointer' }}>
                <Group gap={4}>
                  24h Change <SortIcon field="change" />
                </Group>
              </Table.Th>
              <Table.Th onClick={() => toggleSort('rugRisk')} style={{ cursor: 'pointer' }}>
                <Group gap={4}>
                  Rug Risk <SortIcon field="rugRisk" />
                </Group>
              </Table.Th>
              <Table.Th onClick={() => toggleSort('auditScore')} style={{ cursor: 'pointer' }}>
                <Group gap={4}>
                  Audit <SortIcon field="auditScore" />
                </Group>
              </Table.Th>
              <Table.Th onClick={() => toggleSort('liquidity')} style={{ cursor: 'pointer' }}>
                <Group gap={4}>
                  Liquidity <SortIcon field="liquidity" />
                </Group>
              </Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedAssets.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    No assets match your filters
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {sortedAssets.map(({ asset, change, rugProb }) => (
              <Table.Tr key={asset.id}>
                <Table.Td>
                  <Anchor
                    size="sm"
                    fw={700}
                    c="terminal.5"
                    ff="monospace"
                    onClick={() => navigate(`/symbol/${asset.symbol}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {asset.symbol}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {asset.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {formatUSD(asset.price, asset.price < 1 ? 6 : 2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={getChangeColor(change)} ff="monospace">
                    {formatPercent(change)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" color={getRiskColor(rugProb)} variant="light">
                    {(rugProb * 100).toFixed(1)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge
                    size="sm"
                    color={asset.auditScore > 0.7 ? 'green' : asset.auditScore > 0.4 ? 'yellow' : 'red'}
                    variant="light"
                  >
                    {(asset.auditScore * 100).toFixed(0)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {formatUSD(asset.liquidityUSD, 0)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" color="green" onClick={() => openBuySellModal(asset.id, 'buy')}>
                      Buy
                    </Button>
                    <Button size="xs" color="red" onClick={() => openBuySellModal(asset.id, 'sell')}>
                      Sell
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <BuySellModal />
    </Container>
  );
}
