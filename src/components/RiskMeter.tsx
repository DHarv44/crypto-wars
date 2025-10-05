import { Paper, Stack, Text, Progress, Group, Badge, Divider } from '@mantine/core';
import { Asset } from '../engine/types';
import { calculateRugProbability } from '../engine/risk';
import { getRiskColor } from '../utils/format';

interface RiskMeterProps {
  asset: Asset;
}

export default function RiskMeter({ asset }: RiskMeterProps) {
  const rugProb = calculateRugProbability(asset);
  const rugPct = rugProb * 100;

  const riskLevel =
    rugPct < 10 ? 'Low Risk' : rugPct < 30 ? 'Medium Risk' : 'High Risk';

  const riskColor = getRiskColor(rugProb);

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" fw={700} tt="uppercase" c="terminal.5">
            Risk Meter
          </Text>
          <Badge size="lg" color={riskColor} variant="light">
            {riskLevel}
          </Badge>
        </Group>

        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">
              Rug Probability
            </Text>
            <Text size="sm" fw={700} c={riskColor}>
              {rugPct.toFixed(1)}%
            </Text>
          </Group>
          <Progress value={rugPct} color={riskColor} size="xl" />
        </div>

        <Divider />

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Dev Tokens
            </Text>
            <Badge
              size="sm"
              color={asset.devTokensPct > 50 ? 'red' : asset.devTokensPct > 30 ? 'yellow' : 'green'}
              variant="light"
            >
              {asset.devTokensPct.toFixed(0)}%
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Audit Score
            </Text>
            <Badge
              size="sm"
              color={asset.auditScore > 0.7 ? 'green' : asset.auditScore > 0.4 ? 'yellow' : 'red'}
              variant="light"
            >
              {(asset.auditScore * 100).toFixed(0)}%
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Liquidity
            </Text>
            <Badge
              size="sm"
              color={asset.liquidityUSD > 1_000_000 ? 'green' : asset.liquidityUSD > 200_000 ? 'yellow' : 'red'}
              variant="light"
            >
              ${(asset.liquidityUSD / 1000).toFixed(0)}K
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Social Hype
            </Text>
            <Badge
              size="sm"
              color={asset.socialHype > 0.7 ? 'orange' : asset.socialHype > 0.4 ? 'yellow' : 'blue'}
              variant="light"
            >
              {(asset.socialHype * 100).toFixed(0)}%
            </Badge>
          </Group>
        </Stack>

        {asset.flagged && (
          <>
            <Divider />
            <Badge color="red" variant="filled" fullWidth>
              🚨 FLAGGED AS SUSPICIOUS
            </Badge>
          </>
        )}

        {asset.rugged && (
          <>
            <Divider />
            <Badge color="red" variant="filled" fullWidth>
              💀 RUGGED - DO NOT BUY
            </Badge>
          </>
        )}
      </Stack>
    </Paper>
  );
}
