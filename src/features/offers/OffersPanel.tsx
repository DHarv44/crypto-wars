import { Paper, Stack, Title, Text, Badge, Group, Button, Divider } from '@mantine/core';
import { useStore } from '../../stores/rootStore';
import { formatUSD } from '../../utils/format';
import { acceptGovBump, acceptWhaleOTC } from '../../engine/offers';

export default function OffersPanel() {
  const { activeOffers, acceptOffer, declineOffer, assets, cashUSD, saveToSession } = useStore();

  const availableOffers = activeOffers.filter((o) => !o.accepted);

  const handleAccept = (offerId: string) => {
    const offer = activeOffers.find((o) => o.id === offerId);
    if (!offer) return;

    const store = useStore.getState();

    // Check affordability for whale OTC buy offers
    if (offer.type === 'whale_otc' && offer.cost > 0 && offer.cost > cashUSD) {
      store.pushEvent({
        tick: store.tick,
        type: 'warning',
        message: 'Insufficient funds to accept OTC offer',
      });
      return;
    }

    // Execute the offer
    if (offer.type === 'gov_bump') {
      const asset = assets[offer.assetId!];
      if (!asset) return;

      const result = acceptGovBump(offer, store as any, asset);
      store.applyUpdates(result.playerUpdates);
      store.pushEvent({
        tick: store.tick,
        type: 'success',
        message: result.message,
      });
    } else if (offer.type === 'whale_otc') {
      const result = acceptWhaleOTC(offer, store as any);
      store.applyUpdates(result.playerUpdates);
      store.pushEvent({
        tick: store.tick,
        type: 'success',
        message: result.message,
      });
    }

    // Remove the offer
    acceptOffer(offerId);
    setTimeout(() => store.removeOffer(offerId), 100);

    // Save to session storage after accepting offer
    saveToSession();
  };

  const handleDecline = (offerId: string) => {
    declineOffer(offerId);
    useStore.getState().pushEvent({
      tick: useStore.getState().tick,
      type: 'info',
      message: 'Offer declined',
    });

    // Save to session storage after declining offer
    saveToSession();
  };

  return (
    <Stack gap="lg">
      <Paper p="md" withBorder>
        <Title order={3} c="terminal.5" mb="md">
          ACTIVE OFFERS
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Exclusive deals from governments and whales. Limited time only.
        </Text>

        {availableOffers.length === 0 ? (
          <Paper p="xl" withBorder bg="dark.8">
            <Text size="sm" c="dimmed" ta="center">
              No offers available at the moment. Keep playing to unlock exclusive deals.
            </Text>
          </Paper>
        ) : (
          <Stack gap="md">
            {availableOffers.map((offer) => {
              const asset = offer.assetId ? assets[offer.assetId] : null;
              const expiresIn = offer.expiresAtTick - useStore.getState().tick;
              const canAfford = offer.cost > 0 ? cashUSD >= offer.cost : true;

              return (
                <Paper key={offer.id} p="md" withBorder bg="dark.8">
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <Badge size="lg" color={offer.type === 'gov_bump' ? 'blue' : 'violet'} variant="light">
                        {offer.type === 'gov_bump' ? 'GOVERNMENT BUMP' : 'WHALE OTC'}
                      </Badge>
                      {asset && (
                        <Badge size="sm" color="gray" variant="light" ff="monospace">
                          {asset.symbol}
                        </Badge>
                      )}
                    </Group>
                    <Badge size="sm" color={expiresIn <= 1 ? 'red' : 'yellow'} variant="light">
                      Expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}
                    </Badge>
                  </Group>

                  <Text size="sm" fw={500} mb="xs">
                    {offer.description}
                  </Text>

                  <Text size="sm" c="dimmed" ff="monospace" mb="md">
                    {offer.action}
                  </Text>

                  <Divider my="sm" />

                  <Group justify="space-between" mb="md">
                    <div>
                      {offer.cost > 0 && (
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase">
                            Cost
                          </Text>
                          <Text size="sm" fw={700} ff="monospace" c={canAfford ? 'terminal.5' : 'red'}>
                            {formatUSD(offer.cost, 0)}
                          </Text>
                        </div>
                      )}
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" ta="right">
                        {offer.cost > 0 ? 'Units Received' : 'Cash Received'}
                      </Text>
                      <Text size="sm" fw={700} ff="monospace" c="green" ta="right">
                        {offer.cost > 0 ? `${offer.benefit.toFixed(2)} units` : formatUSD(offer.benefit, 0)}
                      </Text>
                    </div>
                  </Group>

                  {offer.consequence && (
                    <Text size="xs" c="yellow" mb="md">
                      ⚠️ {offer.consequence}
                    </Text>
                  )}

                  <Group gap="sm">
                    <Button flex={1} color="terminal.5" onClick={() => handleAccept(offer.id)} disabled={!canAfford}>
                      {canAfford ? 'Accept' : 'Insufficient Funds'}
                    </Button>
                    <Button flex={1} color="red" variant="outline" onClick={() => handleDecline(offer.id)}>
                      Decline
                    </Button>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Info Panel */}
      <Paper p="md" withBorder>
        <Title order={4} c="terminal.5" mb="md">
          ABOUT OFFERS
        </Title>
        <Stack gap="sm">
          <div>
            <Text size="sm" fw={700} c="blue">
              Government Bump
            </Text>
            <Text size="xs" c="dimmed">
              Government agencies want to acquire portions of your holdings at premium prices. Accepting increases
              scrutiny but provides immediate cash.
            </Text>
          </div>
          <div>
            <Text size="sm" fw={700} c="violet">
              Whale OTC
            </Text>
            <Text size="xs" c="dimmed">
              Large traders offering off-exchange deals. Buy at discounts or sell at premiums. No scrutiny impact.
            </Text>
          </div>
        </Stack>
      </Paper>
    </Stack>
  );
}
