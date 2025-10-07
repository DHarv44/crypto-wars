import { Paper, Stack, Title, Text, Grid, Button, Progress, Badge, Group, Select } from '@mantine/core';
import { useState } from 'react';
import { useStore } from '../../stores/rootStore';
import { formatNumber, formatPercent, formatUSD } from '../../utils/format';

type ContentTone = 'shill' | 'neutral' | 'anti';

const CONTENT_COSTS = {
  post: 500,
  buyFollowers: 2000,
  campaign: 5000,
};

export default function InfluencerPanel() {
  const {
    followers,
    engagement,
    authenticity,
    cashUSD,
    gainFollowers,
    adjustEngagement,
    adjustAuthenticity,
    spendCash,
    adjustStat,
    pushEvent,
    tick,
    saveGame,
  } = useStore();

  const [selectedTone, setSelectedTone] = useState<ContentTone>('neutral');

  const handlePostContent = async () => {
    if (cashUSD < CONTENT_COSTS.post) return;

    const rng = { range: (min: number, max: number) => Math.random() * (max - min) + min };

    const followerGain = Math.floor(rng.range(50, 300) * (1 + engagement));
    const engagementDelta = rng.range(-0.02, 0.05);

    spendCash(CONTENT_COSTS.post);
    gainFollowers(followerGain);
    adjustEngagement(engagementDelta);

    if (selectedTone === 'shill') {
      adjustStat('influence', 5);
    }

    pushEvent({
      tick,
      type: 'info',
      message: `Posted ${selectedTone} content (+${followerGain} followers, ${engagementDelta > 0 ? '+' : ''}${formatPercent(engagementDelta)} engagement)`,
    });

    // Save to IndexedDB after posting content
    await saveGame();
  };

  const handleBuyFollowers = async () => {
    if (cashUSD < CONTENT_COSTS.buyFollowers) return;

    const followersPurchased = CONTENT_COSTS.buyFollowers * 10;
    const authenticityLoss = Math.random() * 0.1 + 0.05;

    spendCash(CONTENT_COSTS.buyFollowers);
    gainFollowers(followersPurchased);
    adjustAuthenticity(-authenticityLoss);

    pushEvent({
      tick,
      type: 'warning',
      message: `Bought ${formatNumber(followersPurchased)} followers (-${formatPercent(authenticityLoss)} authenticity)`,
    });

    // Save to IndexedDB after buying followers
    await saveGame();
  };

  const handleStartCampaign = async () => {
    if (cashUSD < CONTENT_COSTS.campaign) return;

    const followerGain = Math.floor(Math.random() * 1000 + 500);
    const influenceGain = Math.floor(Math.random() * 20 + 10);

    spendCash(CONTENT_COSTS.campaign);
    gainFollowers(followerGain);
    adjustStat('influence', influenceGain);

    pushEvent({
      tick,
      type: 'success',
      message: `Campaign launched! (+${followerGain} followers, +${influenceGain} influence)`,
    });

    // Save to IndexedDB after launching campaign
    await saveGame();
  };

  const influenceScore = Math.floor((followers / 1000) * engagement * authenticity);

  return (
    <Stack gap="lg">
      {/* Influencer Stats */}
      <Paper p="md" withBorder>
        <Title order={3} c="terminal.5" mb="md">
          INFLUENCER STATS
        </Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Followers
                  </Text>
                  <Text size="sm" fw={700} ff="monospace" c="terminal.5">
                    {formatNumber(followers)}
                  </Text>
                </Group>
                <Progress value={Math.min(100, (followers / 100000) * 100)} color="blue" size="lg" />
              </div>

              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Engagement
                  </Text>
                  <Text size="sm" fw={700} ff="monospace">
                    {formatPercent(engagement)}
                  </Text>
                </Group>
                <Progress value={engagement * 100} color="green" size="lg" />
              </div>

              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Authenticity
                  </Text>
                  <Text size="sm" fw={700} ff="monospace" c={authenticity < 0.5 ? 'red' : 'terminal.5'}>
                    {formatPercent(authenticity)}
                  </Text>
                </Group>
                <Progress value={authenticity * 100} color={authenticity < 0.5 ? 'red' : 'terminal.5'} size="lg" />
              </div>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="sm" bg="dark.8">
              <Text size="xs" c="dimmed" tt="uppercase" mb="xs">
                Influence Score
              </Text>
              <Text size="xl" fw={700} ff="monospace" c="terminal.5">
                {formatNumber(influenceScore)}
              </Text>
              <Text size="xs" c="dimmed" mt="sm">
                Based on followers × engagement × authenticity
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Actions */}
      <Paper p="md" withBorder>
        <Title order={3} c="terminal.5" mb="md">
          INFLUENCER ACTIONS
        </Title>

        <Stack gap="md">
          {/* Post Content */}
          <Paper p="sm" withBorder bg="dark.8">
            <Group justify="space-between" mb="sm">
              <div>
                <Text size="sm" fw={700}>
                  Post Content
                </Text>
                <Text size="xs" c="dimmed">
                  Create crypto content to gain followers and engagement
                </Text>
              </div>
              <Badge size="lg" color="blue" variant="light">
                {formatUSD(CONTENT_COSTS.post, 0)}
              </Badge>
            </Group>

            <Select
              label="Content Tone"
              value={selectedTone}
              onChange={(value) => setSelectedTone(value as ContentTone)}
              data={[
                { value: 'shill', label: 'Shill (positive)' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'anti', label: 'Anti (critical)' },
              ]}
              mb="sm"
            />

            <Button fullWidth onClick={handlePostContent} disabled={cashUSD < CONTENT_COSTS.post} color="blue">
              {cashUSD >= CONTENT_COSTS.post ? 'Post Content' : 'Insufficient Funds'}
            </Button>
          </Paper>

          {/* Buy Followers */}
          <Paper p="sm" withBorder bg="dark.8">
            <Group justify="space-between" mb="sm">
              <div>
                <Text size="sm" fw={700}>
                  Buy Followers
                </Text>
                <Text size="xs" c="dimmed">
                  Purchase bot followers (reduces authenticity)
                </Text>
              </div>
              <Badge size="lg" color="yellow" variant="light">
                {formatUSD(CONTENT_COSTS.buyFollowers, 0)}
              </Badge>
            </Group>

            <Text size="xs" c="yellow" mb="sm">
              ⚠️ Gain {formatNumber(CONTENT_COSTS.buyFollowers * 10)} followers but lose 5-15% authenticity
            </Text>

            <Button
              fullWidth
              onClick={handleBuyFollowers}
              disabled={cashUSD < CONTENT_COSTS.buyFollowers}
              color="yellow"
            >
              {cashUSD >= CONTENT_COSTS.buyFollowers ? 'Buy Followers' : 'Insufficient Funds'}
            </Button>
          </Paper>

          {/* Start Campaign */}
          <Paper p="sm" withBorder bg="dark.8">
            <Group justify="space-between" mb="sm">
              <div>
                <Text size="sm" fw={700}>
                  Launch Campaign
                </Text>
                <Text size="xs" c="dimmed">
                  Run a large marketing campaign for massive growth
                </Text>
              </div>
              <Badge size="lg" color="green" variant="light">
                {formatUSD(CONTENT_COSTS.campaign, 0)}
              </Badge>
            </Group>

            <Text size="xs" c="green" mb="sm">
              ✓ Gain 500-1500 followers and 10-30 influence
            </Text>

            <Button
              fullWidth
              onClick={handleStartCampaign}
              disabled={cashUSD < CONTENT_COSTS.campaign}
              color="terminal.5"
            >
              {cashUSD >= CONTENT_COSTS.campaign ? 'Launch Campaign' : 'Insufficient Funds'}
            </Button>
          </Paper>
        </Stack>
      </Paper>

      {/* Info */}
      <Paper p="md" withBorder>
        <Title order={4} c="terminal.5" mb="md">
          ABOUT INFLUENCER MODE
        </Title>
        <Text size="sm" c="dimmed">
          Build your crypto influencer presence to gain market influence. Higher follower counts and engagement increase
          your ability to move markets. Authenticity affects how much your audience trusts you. Shill content boosts
          influence but may reduce authenticity if overused.
        </Text>
      </Paper>
    </Stack>
  );
}
