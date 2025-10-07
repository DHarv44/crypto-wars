import { Stack, Title, Text, Paper, Box, Button, Radio, Group, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import { useStore } from '../../stores/rootStore';
import { backfillProfile } from '../../data/backfill';
import type { Vibe } from './onboardingSlice';

const VIBES: Array<{ id: Vibe; name: string; description: string; projection: string }> = [
  {
    id: 'shill-maxx',
    name: 'Shill Maxx 📢',
    description: 'Post exclusively bullish content. Every coin is "going to 100x."',
    projection: '+4.2k followers, +15% engagement, −10% authenticity',
  },
  {
    id: 'market-zen',
    name: 'Market Zen 🧘',
    description: 'Balanced takes. Measured analysis. No caps lock.',
    projection: '+2.8k followers, +5% engagement, +5% authenticity',
  },
  {
    id: 'investigative-fud',
    name: 'Investigative FUD 🔍',
    description: 'Expose rugs before they happen. Truth-seeking. High-risk, high-reward.',
    projection: '+1.5k followers, +20% authenticity, ±reputation (depends on accuracy)',
  },
];

export default function Screen3Vibe() {
  const { vibe, setVibe, setScreen, handle, alias, title, archetype, toggle, completeOnboarding, initGame, seed, addArticles, saveGame } =
    useStore();
  const [isBackfilling, setIsBackfilling] = useState(false);

  const handleStart = async () => {
    if (!vibe) return;

    setIsBackfilling(true);

    // Apply stat modifiers based on selections
    const store = useStore.getState();

    // Toggle modifiers
    if (toggle === 'diamond-hands') {
      store.adjustStat('reputation', 20);
      store.spendCash(20000);
    } else if (toggle === 'paper-hands') {
      store.gainCash(30000);
      store.adjustStat('reputation', -10);
    } else if (toggle === 'anon-mask') {
      store.adjustStat('security', 20);
      store.adjustStat('influence', -10);
    }

    // Archetype modifiers
    switch (archetype) {
      case 'meme-mogul':
        store.gainFollowers(8000);
        store.adjustEngagement(0.1);
        store.adjustAuthenticity(-0.1);
        break;
      case 'rug-academic':
        store.adjustStat('security', 20);
        store.adjustStat('reputation', 15);
        store.gainFollowers(-500);
        break;
      case 'otc-fixer':
        store.gainCash(20000);
        store.adjustStat('influence', 15);
        store.adjustStat('scrutiny', 15);
        break;
      case 'bot-rancher':
        store.adjustStat('exposure', 20);
        store.adjustEngagement(0.15);
        store.adjustAuthenticity(-0.2);
        break;
    }

    // Vibe modifiers
    switch (vibe) {
      case 'shill-maxx':
        store.gainFollowers(4200);
        store.adjustEngagement(0.15);
        store.adjustAuthenticity(-0.1);
        break;
      case 'market-zen':
        store.gainFollowers(2800);
        store.adjustEngagement(0.05);
        store.adjustAuthenticity(0.05);
        break;
      case 'investigative-fud':
        store.gainFollowers(1500);
        store.adjustAuthenticity(0.2);
        break;
    }

    // Save profile info to state
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    store.setProfile({
      id: profileId,
      handle,
      alias,
      title,
      archetype: archetype || 'meme-mogul',
      vibe,
    });

    // Complete onboarding and init game
    completeOnboarding();
    await initGame();

    // Backfill historical chart data (use actual profile ID)
    try {
      console.log('[Screen3Vibe] Starting historical data backfill...');
      const { newsEvents, priceHistory } = await backfillProfile(profileId, seed);
      console.log('[Screen3Vibe] Backfill complete!', newsEvents.length, 'news events');

      // Convert GeneratedEvent to NewsArticle format and add to newsSlice
      const newsArticles = newsEvents.map((event: any, index: number) => ({
        id: `backfill_${event.assetId}_${event.day}_${index}`,
        day: event.day,
        assetId: event.assetId,
        assetSymbol: event.assetSymbol,
        headline: event.headline,
        sentiment: event.impact === 'positive' ? 'bullish' as const : event.impact === 'negative' ? 'bearish' as const : 'neutral' as const,
        weight: Math.abs(event.severity * 100), // Convert severity to 0-100 weight
        category: 'general',
        isFake: false,
        impactRealized: true,
      }));

      console.log('[Screen3Vibe] Adding', newsArticles.length, 'news articles to newsSlice');
      addArticles(newsArticles);

      // Populate assets with historical price data
      console.log('[Screen3Vibe] Populating assets with', Object.keys(priceHistory).length, 'price histories');
      for (const [assetId, candles] of Object.entries(priceHistory)) {
        store.setAssetPriceHistory(assetId, candles);
      }

      // Save game again to persist the news articles and price history
      console.log('[Screen3Vibe] Saving game with news articles and price history...');
      await saveGame();
      console.log('[Screen3Vibe] Game saved with news articles and price history!');
    } catch (error) {
      console.error('[Screen3Vibe] Backfill error:', error);
    }

    setIsBackfilling(false);
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0B0E12 0%, #141821 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Paper
        p="xl"
        withBorder
        style={{
          maxWidth: '700px',
          width: '100%',
          background: 'rgba(11, 14, 18, 0.95)',
          borderColor: 'rgba(0, 255, 0, 0.3)',
          position: 'relative',
        }}
      >
        <LoadingOverlay
          visible={isBackfilling}
          overlayProps={{ blur: 2 }}
          loaderProps={{ children: 'Hydrating the blockchain...' }}
        />
        <Stack gap="xl">
          {/* Header */}
          <Box ta="center">
            <Title order={2} c="terminal.5" ff="monospace" mb="xs">
              Vibe Check
            </Title>
            <Text size="sm" c="dimmed">
              Pick your posting vibe. The feed is hungry.
            </Text>
          </Box>

          {/* Vibe Options */}
          <Radio.Group value={vibe || ''} onChange={(val) => setVibe(val as Vibe)}>
            <Stack gap="md">
              {VIBES.map((v) => (
                <Paper key={v.id} p="md" withBorder bg={vibe === v.id ? 'rgba(0, 255, 0, 0.05)' : 'transparent'}>
                  <Radio
                    value={v.id}
                    label={
                      <Box>
                        <Text size="md" fw={700} mb="xs">
                          {v.name}
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          {v.description}
                        </Text>
                        <Text size="xs" c="terminal.5" ff="monospace">
                          Projected first week: {v.projection}
                        </Text>
                      </Box>
                    }
                    styles={{
                      label: { cursor: 'pointer', width: '100%' },
                    }}
                  />
                </Paper>
              ))}
            </Stack>
          </Radio.Group>

          {/* Summary */}
          <Paper p="md" withBorder bg="rgba(0, 255, 0, 0.05)">
            <Text size="sm" fw={700} mb="xs" c="terminal.5">
              Your Profile
            </Text>
            <Group gap="xs">
              <Text size="sm" c="dimmed" ff="monospace">
                @{handle || 'undefined'}
              </Text>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Text size="sm" c="dimmed">
                {title}
              </Text>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Text size="sm" c="dimmed">
                {archetype?.replace('-', ' ')}
              </Text>
            </Group>
          </Paper>

          {/* CTA */}
          <Button fullWidth size="xl" color="terminal.5" onClick={handleStart} disabled={!vibe}>
            ENTER THE CASINO 🎰
          </Button>

          {/* Tutorial Skip */}
          <Button variant="subtle" size="sm" onClick={handleStart} disabled={!vibe}>
            Skip Tutorial (I'm Built Different)
          </Button>

          {/* Back */}
          <Button variant="subtle" onClick={() => setScreen(2)}>
            ← Back
          </Button>

          {/* Disclaimer */}
          <Text size="xs" c="dimmed" ta="center" fs="italic">
            Remember: WAGMI* *terms and conditions apply
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}
