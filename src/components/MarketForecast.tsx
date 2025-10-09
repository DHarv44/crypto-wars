import { Paper, Text, Group, Stack, Badge } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { MarketVibe } from '../engine/types';

const VIBE_INFO: Record<
  MarketVibe,
  { label: string; color: string; icon: string; description: string }
> = {
  moonshot: {
    label: 'Moonshot Day',
    color: 'green',
    icon: '🚀',
    description: 'Select coins are primed for massive pumps',
  },
  bloodbath: {
    label: 'Market Bloodbath',
    color: 'red',
    icon: '📉',
    description: 'Everything is crashing hard today',
  },
  rugseason: {
    label: 'Rug Season',
    color: 'orange',
    icon: '🚨',
    description: 'High risk of rug pulls - watch your bags',
  },
  whalewar: {
    label: 'Whale War',
    color: 'blue',
    icon: '🐋',
    description: 'Massive volatile swings from competing whales',
  },
  memefrenzy: {
    label: 'Meme Frenzy',
    color: 'violet',
    icon: '🔥',
    description: 'Social hype is driving everything crazy',
  },
  normie: {
    label: 'Normal Day',
    color: 'gray',
    icon: '📊',
    description: 'Standard market conditions',
  },
};

export default function MarketForecast() {
  const { marketVibe, tradingStarted } = useStore();

  // Only show when trading hasn't started yet
  if (tradingStarted) return null;

  const info = VIBE_INFO[marketVibe];

  return (
    <Paper p="md" withBorder bg="dark.7" style={{ borderColor: info.color }}>
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="sm">
            <Text size="2rem">{info.icon}</Text>
            <Stack gap={2}>
              <Text size="xl" fw={700} c={info.color}>
                {info.label}
              </Text>
              <Text size="sm" c="dimmed">
                Market Forecast
              </Text>
            </Stack>
          </Group>
          <Badge size="lg" color={info.color} variant="dot">
            {marketVibe.toUpperCase()}
          </Badge>
        </Group>

        <Text size="md" c="dimmed" fs="italic">
          {info.description}
        </Text>

        <Text size="xs" c="dimmed" ta="center" mt="xs">
          Click "Start Trading" when you're ready to begin
        </Text>
      </Stack>
    </Paper>
  );
}
