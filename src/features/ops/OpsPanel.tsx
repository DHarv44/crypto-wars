import { Paper, Stack, Title, Grid, Button, Select, Text, Badge, Group, Divider } from '@mantine/core';
import { useState } from 'react';
import { useStore } from '../../stores/rootStore';
import { OperationType } from '../../engine/types';
import { formatUSD } from '../../utils/format';

const OP_COSTS: Record<OperationType, number> = {
  pump: 50000,
  wash: 75000,
  audit: 100000,
  bribe: 150000,
};

const OP_DURATIONS: Record<OperationType, number> = {
  pump: 3,
  wash: 5,
  audit: 1,
  bribe: 1,
};

const OP_DESCRIPTIONS: Record<OperationType, string> = {
  pump: 'Artificially inflate price through coordinated buying. Lasts 3 days. +15-30% price boost.',
  wash: 'Create fake volume to attract traders. Lasts 5 days. Increases social hype and apparent liquidity.',
  audit: 'Pay for positive security audit. Instant. +0.3 audit score. Reduces rug risk.',
  bribe: 'Bribe regulators to reduce scrutiny. Instant. -20 scrutiny. Costs influence.',
};

export default function OpsPanel() {
  const { assets, list, cashUSD, influence, scrutiny, activeOps, addOperation, saveGame } = useStore();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<OperationType>('pump');

  // Get tradeable assets (not rugged)
  const assetOptions = list
    .map((id) => assets[id])
    .filter((asset) => asset && !asset.rugged)
    .map((asset) => ({
      value: asset.id,
      label: `${asset.symbol} - ${asset.name}`,
    }));

  const selectedAsset = selectedAssetId ? assets[selectedAssetId] : null;
  const opCost = OP_COSTS[selectedOp];
  const canAfford = cashUSD >= opCost;
  const hasInfluence = selectedOp === 'bribe' ? influence >= 50 : true;

  const handleExecute = async () => {
    if (!selectedAsset || !canAfford || !hasInfluence) return;

    const store = useStore.getState();

    // Generate operation ID
    const opId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create operation
    const operation = {
      id: opId,
      type: selectedOp,
      assetId: selectedAsset.id,
      startTick: store.tick,
      duration: OP_DURATIONS[selectedOp],
      cost: opCost,
    };

    // Execute operation through store
    addOperation(operation);

    // Deduct cost
    store.spendCash(opCost);

    // Special handling for instant operations
    if (selectedOp === 'audit') {
      // Apply audit score boost immediately
      const currentAsset = store.assets[selectedAsset.id];
      const scoreBoost = 0.3;
      const newScore = Math.min(1, currentAsset.auditScore + scoreBoost);
      store.applyTickUpdates({
        [selectedAsset.id]: { auditScore: newScore },
      });
      store.pushEvent({
        tick: store.tick,
        type: 'success',
        message: `AUDIT completed for ${selectedAsset.symbol}. Audit score increased by ${(scoreBoost * 100).toFixed(0)}%`,
      });
    } else if (selectedOp === 'bribe') {
      store.adjustStat('influence', -50);
      store.adjustStat('scrutiny', -20);
      store.pushEvent({
        tick: store.tick,
        type: 'warning',
        message: `BRIBE operation completed. Scrutiny reduced by 20 (-50 influence)`,
      });
    } else {
      // Pump and wash are ongoing operations
      store.pushEvent({
        tick: store.tick,
        type: 'info',
        message: `Initiated ${selectedOp.toUpperCase()} operation on ${selectedAsset.symbol} for ${formatUSD(opCost, 0)}`,
      });
    }

    // Save to IndexedDB after operation
    await saveGame();

    // Reset selection
    setSelectedAssetId(null);
  };

  return (
    <Stack gap="lg">
      {/* Active Operations */}
      <Paper p="md" withBorder>
        <Title order={3} c="terminal.5" mb="md">
          ACTIVE OPERATIONS
        </Title>
        {activeOps.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            No active operations
          </Text>
        ) : (
          <Stack gap="xs">
            {activeOps.map((op) => {
              const asset = assets[op.assetId];
              const remainingTicks = op.duration - (useStore.getState().tick - op.startTick);
              const isActive = remainingTicks > 0;

              return (
                <Paper key={op.id} p="sm" withBorder bg="dark.8">
                  <Group justify="space-between">
                    <div>
                      <Group gap="xs">
                        <Badge size="sm" color="blue" variant="light">
                          {op.type.toUpperCase()}
                        </Badge>
                        <Text size="sm" fw={700} c="terminal.5" ff="monospace">
                          {asset?.symbol || 'UNKNOWN'}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" mt={4}>
                        Cost: {formatUSD(op.cost, 0)} | Started: Day {op.startTick}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isActive ? (
                        <Badge size="sm" color="green" variant="light">
                          {remainingTicks} days left
                        </Badge>
                      ) : (
                        <Badge size="sm" color="gray" variant="light">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* New Operation */}
      <Paper p="md" withBorder>
        <Title order={3} c="terminal.5" mb="md">
          INITIATE OPERATION
        </Title>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Target Asset"
              placeholder="Select asset"
              value={selectedAssetId}
              onChange={setSelectedAssetId}
              data={assetOptions}
              searchable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Operation Type"
              value={selectedOp}
              onChange={(value) => setSelectedOp(value as OperationType)}
              data={[
                { value: 'pump', label: 'Pump (3 days)' },
                { value: 'wash', label: 'Wash Trading (5 days)' },
                { value: 'audit', label: 'Buy Audit (instant)' },
                { value: 'bribe', label: 'Bribe Officials (instant)' },
              ]}
            />
          </Grid.Col>
        </Grid>

        {selectedOp && (
          <>
            <Divider my="md" />
            <Paper p="sm" bg="dark.8" mb="md">
              <Text size="sm" c="dimmed" mb="xs">
                {OP_DESCRIPTIONS[selectedOp]}
              </Text>
              <Group gap="lg" mt="md">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Cost
                  </Text>
                  <Text size="sm" ff="monospace" fw={700} c={canAfford ? 'terminal.5' : 'red'}>
                    {formatUSD(opCost, 0)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Duration
                  </Text>
                  <Text size="sm" ff="monospace" fw={700}>
                    {OP_DURATIONS[selectedOp] === 1 ? 'Instant' : `${OP_DURATIONS[selectedOp]} days`}
                  </Text>
                </div>
                {selectedOp === 'bribe' && (
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase">
                      Influence Cost
                    </Text>
                    <Text size="sm" ff="monospace" fw={700} c={hasInfluence ? 'terminal.5' : 'red'}>
                      50
                    </Text>
                  </div>
                )}
              </Group>
            </Paper>

            <Button
              fullWidth
              onClick={handleExecute}
              disabled={!selectedAsset || !canAfford || !hasInfluence}
              color="terminal.5"
            >
              {!selectedAsset
                ? 'Select an asset'
                : !canAfford
                  ? 'Insufficient funds'
                  : !hasInfluence
                    ? 'Insufficient influence'
                    : `Execute ${selectedOp.toUpperCase()}`}
            </Button>
          </>
        )}
      </Paper>

      {/* Player Stats */}
      <Paper p="md" withBorder>
        <Title order={4} c="terminal.5" mb="md">
          YOUR RESOURCES
        </Title>
        <Grid>
          <Grid.Col span={4}>
            <Text size="xs" c="dimmed" tt="uppercase">
              Cash
            </Text>
            <Text size="lg" ff="monospace" fw={700} c="terminal.5">
              {formatUSD(cashUSD, 0)}
            </Text>
          </Grid.Col>
          <Grid.Col span={4}>
            <Text size="xs" c="dimmed" tt="uppercase">
              Influence
            </Text>
            <Text size="lg" ff="monospace" fw={700}>
              {influence.toFixed(0)}
            </Text>
          </Grid.Col>
          <Grid.Col span={4}>
            <Text size="xs" c="dimmed" tt="uppercase">
              Scrutiny
            </Text>
            <Text size="lg" ff="monospace" fw={700} c={scrutiny > 70 ? 'red' : scrutiny > 40 ? 'yellow' : 'terminal.5'}>
              {scrutiny.toFixed(0)}
            </Text>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}
