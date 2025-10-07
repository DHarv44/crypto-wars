import { Modal, Stack, Text, NumberInput, Button, Group, Alert } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useStore } from '../../stores/rootStore';
import { executeTrade } from '../../engine/api';
import { formatUSD, formatUnits, UNIT_PRECISION, UNIT_STEP, TRADING_FEE } from '../../utils/format';
import { notifications } from '@mantine/notifications';

export default function BuySellModal() {
  const {
    buySellModalOpen,
    selectedAssetId,
    tradeType,
    closeBuySellModal,
    assets,
    cashUSD,
    holdings,
    applyUpdates,
    applyTickUpdates,
    recordTrade,
    day,
    getTimeUntilNextDay,
    realTimeDayDuration,
    saveGame,
    marketOpen,
  } = useStore();

  const [amount, setAmount] = useState<number | string>(0);

  const asset = selectedAssetId ? assets[selectedAssetId] : null;
  const currentHoldings = selectedAssetId ? holdings[selectedAssetId] || 0 : 0;

  const quote = useMemo(() => {
    if (!asset || !amount || typeof amount === 'string') return null;

    if (tradeType === 'buy') {
      const units = amount / asset.price;
      return {
        amount,
        units,
        canAfford: amount <= cashUSD,
      };
    } else {
      // Sell
      const units = amount;
      const usd = units * asset.price;
      return {
        amount: usd,
        units,
        canAfford: units <= currentHoldings,
      };
    }
  }, [asset, amount, tradeType, cashUSD, currentHoldings]);

  const handleExecute = async () => {
    if (!asset || !quote) return;

    try {
      const player = {
        cashUSD,
        holdings,
        netWorthUSD: 0,
        reputation: 0,
        influence: 0,
        security: 0,
        scrutiny: 0,
        exposure: 0,
        lpPositions: [],
        blacklisted: false,
      };

      const result = executeTrade(
        {
          type: tradeType === 'buy' ? 'BUY' : 'SELL',
          assetId: asset.id,
          usd: tradeType === 'buy' ? Number(amount) : undefined,
          units: tradeType === 'sell' ? Number(amount) : undefined,
        },
        asset,
        player
      );

      // Apply updates
      if (result.assetUpdates && Object.keys(result.assetUpdates).length > 0) {
        applyTickUpdates({ [asset.id]: result.assetUpdates });
      }
      applyUpdates(result.playerUpdates);

      // Calculate current tick based on elapsed time in the day
      const ticksPerDay = 1800;
      const remaining = getTimeUntilNextDay();
      const elapsed = realTimeDayDuration - remaining;
      const currentTickInDay = Math.floor((elapsed / realTimeDayDuration) * ticksPerDay);
      const absoluteTick = (day - 1) * ticksPerDay + currentTickInDay;

      // Record trade for P&L tracking
      recordTrade({
        tick: absoluteTick,
        type: tradeType === 'buy' ? 'buy' : 'sell',
        assetId: asset.id,
        assetSymbol: asset.symbol,
        units: quote.units,
        pricePerUnit: asset.price,
        totalUSD: tradeType === 'buy' ? Number(amount) : quote.amount,
        fees: tradeType === 'sell' ? TRADING_FEE : undefined,
      });

      // Save to IndexedDB after trade
      await saveGame();

      // Show success notification
      notifications.show({
        title: tradeType === 'buy' ? 'Purchase Successful' : 'Sale Successful',
        message: result.message,
        color: tradeType === 'buy' ? 'green' : 'blue',
      });

      // Close modal and reset
      setAmount(0);
      closeBuySellModal();
    } catch (error) {
      notifications.show({
        title: 'Trade Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    }
  };

  const handleClose = () => {
    setAmount(0);
    closeBuySellModal();
  };

  if (!asset) return null;

  return (
    <Modal
      opened={buySellModalOpen}
      onClose={handleClose}
      title={
        <Text size="lg" fw={700} c="terminal.5" tt="uppercase">
          {tradeType === 'buy' ? 'Buy' : 'Sell'} {asset.symbol}
        </Text>
      }
      size="md"
    >
      <Stack gap="md">
        {/* Market Closed Warning */}
        {!marketOpen && (
          <Alert color="yellow" variant="light">
            <Text size="sm" fw={700}>
              Market Closed
            </Text>
            <Text size="xs">
              Trading is disabled. Advance to the next day to resume trading.
            </Text>
          </Alert>
        )}

        {/* Asset Info */}
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">
              Current Price
            </Text>
            <Text size="xl" fw={700} ff="monospace" c="terminal.5">
              {formatUSD(asset.price, asset.price < 1 ? 6 : 2)}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              Your Holdings
            </Text>
            <Text size="lg" fw={700} ff="monospace">
              {formatUnits(currentHoldings)} {asset.symbol}
            </Text>
          </div>
        </Group>

        {/* Amount Input */}
        <NumberInput
          label={tradeType === 'buy' ? 'Amount (USD)' : 'Amount (Units)'}
          placeholder={tradeType === 'buy' ? 'Enter USD amount' : 'Enter units to sell'}
          value={amount}
          onChange={setAmount}
          min={0}
          max={tradeType === 'buy' ? cashUSD : currentHoldings}
          step={tradeType === 'buy' ? 100 : UNIT_STEP}
          decimalScale={tradeType === 'buy' ? 2 : UNIT_PRECISION}
          leftSection={tradeType === 'buy' ? '$' : undefined}
          size="lg"
          disabled={!marketOpen}
        />

        {/* Quote */}
        {quote && (
          <Alert color={quote.canAfford ? 'blue' : 'red'} variant="light">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">
                  {tradeType === 'buy' ? 'You will receive:' : 'You will get:'}
                </Text>
                <Text size="sm" fw={700} ff="monospace">
                  {tradeType === 'buy'
                    ? `${quote.units.toFixed(4)} ${asset.symbol}`
                    : formatUSD(quote.amount, 2)}
                </Text>
              </Group>
              {!quote.canAfford && (
                <Text size="sm" c="red">
                  {tradeType === 'buy' ? 'Insufficient cash!' : 'Insufficient holdings!'}
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        {/* Available Balance */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {tradeType === 'buy' ? 'Available Cash:' : 'Available Units:'}
          </Text>
          <Text size="sm" fw={700} ff="monospace">
            {tradeType === 'buy' ? formatUSD(cashUSD, 2) : `${formatUnits(currentHoldings)} ${asset.symbol}`}
          </Text>
        </Group>

        {/* Actions */}
        <Group justify="space-between" mt="md">
          <div>
            {tradeType === 'sell' && currentHoldings > 0 && (
              <Button
                variant="outline"
                color="red"
                onClick={() => setAmount(currentHoldings)}
                disabled={!marketOpen}
              >
                Sell All
              </Button>
            )}
          </div>
          <Group>
            <Button variant="light" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              color={tradeType === 'buy' ? 'green' : 'red'}
              onClick={handleExecute}
              disabled={!marketOpen || !quote || !quote.canAfford || !amount || amount === 0}
            >
              {tradeType === 'buy' ? 'Buy' : 'Sell'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
