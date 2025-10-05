import { Group, Paper, Stack, Text, Badge, Progress, Tooltip } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatUSD, formatNumber, clampStat } from '../utils/format';

export default function KPIBar() {
  const {
    cashUSD,
    netWorthUSD,
    reputation,
    influence,
    security,
    scrutiny,
    exposure,
  } = useStore();

  const netWorthChange = netWorthUSD - 10000; // Initial was 10k
  const changeColor = netWorthChange >= 0 ? 'darkGreen' : 'darkRed';
  const changeSign = netWorthChange >= 0 ? '+' : '';

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" wrap="wrap" gap="md">
        {/* Cash */}
        <Stack gap={4} style={{ minWidth: 120 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Cash
          </Text>
          <Text size="lg" fw={700} c="terminal.5" ff="monospace">
            {formatUSD(cashUSD, 0)}
          </Text>
        </Stack>

        {/* Net Worth */}
        <Stack gap={4} style={{ minWidth: 150 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Net Worth
          </Text>
          <Group gap="xs">
            <Text size="lg" fw={700} c="terminal.5" ff="monospace">
              {formatUSD(netWorthUSD, 0)}
            </Text>
            <Badge size="sm" color={changeColor} variant="light">
              {changeSign}
              {formatUSD(netWorthChange, 0)}
            </Badge>
          </Group>
        </Stack>

        {/* Reputation */}
        <Stack gap={4} style={{ minWidth: 140 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Reputation
          </Text>
          <Tooltip label={`${formatNumber(reputation, 0)}/100`}>
            <div>
              <Progress
                value={clampStat(reputation, 0, 100)}
                color={reputation > 70 ? 'green' : reputation > 40 ? 'yellow' : 'red'}
                size="lg"
              />
            </div>
          </Tooltip>
        </Stack>

        {/* Influence */}
        <Stack gap={4} style={{ minWidth: 140 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Influence
          </Text>
          <Tooltip label={`${formatNumber(influence, 1)}/100`}>
            <div>
              <Progress value={clampStat(influence, 0, 100)} color="blue" size="lg" />
            </div>
          </Tooltip>
        </Stack>

        {/* Security */}
        <Stack gap={4} style={{ minWidth: 140 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Security
          </Text>
          <Tooltip label={`${formatNumber(security, 0)}/100`}>
            <div>
              <Progress value={clampStat(security, 0, 100)} color="cyan" size="lg" />
            </div>
          </Tooltip>
        </Stack>

        {/* Scrutiny */}
        <Stack gap={4} style={{ minWidth: 140 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Scrutiny ⚠️
          </Text>
          <Tooltip label={`${formatNumber(scrutiny, 0)}/100`}>
            <div>
              <Progress
                value={clampStat(scrutiny, 0, 100)}
                color={scrutiny > 70 ? 'red' : scrutiny > 40 ? 'orange' : 'gray'}
                size="lg"
              />
            </div>
          </Tooltip>
        </Stack>

        {/* Exposure */}
        <Stack gap={4} style={{ minWidth: 140 }}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Exposure ⚠️
          </Text>
          <Tooltip label={`${formatNumber(exposure, 0)}/100`}>
            <div>
              <Progress
                value={clampStat(exposure, 0, 100)}
                color={exposure > 70 ? 'red' : exposure > 40 ? 'orange' : 'gray'}
                size="lg"
              />
            </div>
          </Tooltip>
        </Stack>
      </Group>
    </Paper>
  );
}
