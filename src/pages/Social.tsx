import {
  Container,
  Title,
  Grid,
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Textarea,
  Select,
  Badge,
  Timeline,
  Progress,
  SegmentedControl,
  Alert,
} from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { useState } from 'react';
import { formatNumber } from '../utils/format';
import { IconCheck, IconX, IconClock, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import type { PostType, AnalysisDirection, AnalysisTimeframe } from '../stores/socialSlice';

export default function Social() {
  const {
    social,
    posts,
    assets,
    list,
    createPost,
    calculateInfluence,
    isFeatureUnlocked,
  } = useStore();

  const [postType, setPostType] = useState<PostType>('shill');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [content, setContent] = useState('');
  const [analysisDirection, setAnalysisDirection] = useState<AnalysisDirection>('long');
  const [analysisTimeframe, setAnalysisTimeframe] = useState<AnalysisTimeframe>('3d');

  const influencerUnlocked = isFeatureUnlocked('influencer');
  const influence = calculateInfluence();

  // Asset options for dropdown
  const assetOptions = list
    .map((id) => assets[id])
    .filter((a) => a && !a.rugged)
    .map((a) => ({
      value: a.id,
      label: `${a.symbol} - ${a.name}`,
    }));

  const handlePost = () => {
    if (!selectedAsset || !content.trim()) return;

    if (postType === 'analysis') {
      createPost(postType, selectedAsset, content, {
        direction: analysisDirection,
        timeframe: analysisTimeframe,
      });
    } else {
      createPost(postType, selectedAsset, content);
    }

    // Reset form
    setContent('');
  };

  // Calculate accuracy
  const accuracy = social.totalCalls > 0 ? (social.correctCalls / social.totalCalls) * 100 : 0;

  // Get post type label
  const getPostTypeLabel = (type: PostType) => {
    switch (type) {
      case 'shill':
        return { label: 'Shill', color: 'green', desc: 'Hype up a coin' };
      case 'analysis':
        return { label: 'Analysis', color: 'blue', desc: 'Make a directional call (tracks credibility)' };
      case 'meme':
        return { label: 'Meme', color: 'grape', desc: 'Post a meme (high engagement)' };
      case 'fud':
        return { label: 'FUD', color: 'red', desc: 'Spread fear, uncertainty, doubt' };
    }
  };

  return (
    <Container size="xl" py="xl">
      <Title order={1} c="terminal.5" mb="lg">
        SOCIAL
      </Title>

      <Grid>
        {/* Left: Stats & Composer */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Stats */}
          <Paper p="md" withBorder mb="md">
            <Text size="sm" fw={700} mb="md" c="terminal.5" tt="uppercase">
              Your Stats
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Followers
                  </Text>
                  <Text size="xl" fw={700} c="terminal.5" ff="monospace">
                    {formatNumber(social.followers, 0)}
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={6}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Engagement
                  </Text>
                  <Text size="xl" fw={700} ff="monospace">
                    {(social.engagement * 100).toFixed(1)}%
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={6}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Credibility
                  </Text>
                  <Progress
                    value={social.credibility * 100}
                    color={
                      social.credibility > 0.7 ? 'green' : social.credibility > 0.5 ? 'yellow' : 'red'
                    }
                    size="lg"
                  />
                  <Text size="sm" c="dimmed">
                    {(social.credibility * 100).toFixed(0)}% • {social.correctCalls}/{social.totalCalls}{' '}
                    calls ({accuracy.toFixed(0)}% accuracy)
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={6}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Influence
                  </Text>
                  <Text size="xl" fw={700} ff="monospace">
                    {influence.toFixed(1)}/10
                  </Text>
                </Stack>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Post Composer */}
          <Paper p="md" withBorder>
            <Text size="sm" fw={700} mb="md" c="terminal.5" tt="uppercase">
              Compose Post
            </Text>

            <Stack gap="md">
              {/* Post Type */}
              <SegmentedControl
                value={postType}
                onChange={(value) => setPostType(value as PostType)}
                data={[
                  { value: 'shill', label: 'Shill' },
                  { value: 'analysis', label: 'Analysis' },
                  { value: 'meme', label: 'Meme' },
                  { value: 'fud', label: 'FUD' },
                ]}
                fullWidth
              />

              {/* Type description */}
              <Alert color={getPostTypeLabel(postType).color} variant="light">
                <Text size="sm">{getPostTypeLabel(postType).desc}</Text>
              </Alert>

              {/* Asset Selection */}
              <Select
                label="Target Asset"
                placeholder="Select a coin"
                data={assetOptions}
                value={selectedAsset}
                onChange={(value) => setSelectedAsset(value || '')}
                searchable
              />

              {/* Analysis-specific controls */}
              {postType === 'analysis' && (
                <Group grow>
                  <Select
                    label="Direction"
                    data={[
                      { value: 'long', label: '📈 Long (bullish)' },
                      { value: 'short', label: '📉 Short (bearish)' },
                    ]}
                    value={analysisDirection}
                    onChange={(value) => setAnalysisDirection(value as AnalysisDirection)}
                  />
                  <Select
                    label="Timeframe"
                    data={[
                      { value: '1d', label: '1 Day' },
                      { value: '3d', label: '3 Days' },
                      { value: '1w', label: '1 Week' },
                    ]}
                    value={analysisTimeframe}
                    onChange={(value) => setAnalysisTimeframe(value as AnalysisTimeframe)}
                  />
                </Group>
              )}

              {/* Content */}
              <Textarea
                label="Content"
                placeholder={
                  postType === 'analysis'
                    ? `Example: $${selectedAsset || 'BTC'} breaking resistance at $45k. Targeting $50k within ${analysisTimeframe}. Chart looks bullish AF 🚀`
                    : `Example: $${selectedAsset || 'BTC'} is the future. Buy now or cry later 💎🙌`
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                minRows={3}
              />

              {/* Post fatigue warning */}
              {social.postsToday >= 2 && (
                <Alert color="yellow" variant="light">
                  <Text size="sm">
                    ⚠️ Posting {social.postsToday + 1} times today. Engagement will be reduced due to
                    fatigue.
                  </Text>
                </Alert>
              )}

              <Button
                color="terminal.5"
                onClick={handlePost}
                disabled={!selectedAsset || !content.trim()}
                fullWidth
              >
                Post
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right: Feed */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" withBorder>
            <Text size="sm" fw={700} mb="md" c="terminal.5" tt="uppercase">
              Your Feed
            </Text>

            {posts.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No posts yet. Start posting!
              </Text>
            )}

            <Timeline active={posts.length} bulletSize={24} lineWidth={2}>
              {posts.slice(0, 20).map((post) => {
                const typeInfo = getPostTypeLabel(post.type);

                return (
                  <Timeline.Item
                    key={post.id}
                    bullet={
                      post.resolved && post.type === 'analysis' ? (
                        post.correct ? (
                          <IconCheck size={12} />
                        ) : (
                          <IconX size={12} />
                        )
                      ) : post.type === 'analysis' ? (
                        <IconClock size={12} />
                      ) : post.direction === 'long' ? (
                        <IconTrendingUp size={12} />
                      ) : (
                        <IconTrendingDown size={12} />
                      )
                    }
                    title={
                      <Group gap="xs">
                        <Badge size="sm" color={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        <Text size="sm" fw={600}>
                          @{assets[post.assetId]?.symbol || post.assetId}
                        </Text>
                        {post.type === 'analysis' && (
                          <Badge size="sm" variant="outline">
                            {post.direction === 'long' ? '📈' : '📉'} {post.timeframe}
                          </Badge>
                        )}
                      </Group>
                    }
                  >
                    <Text size="sm" c="dimmed" mb="xs">
                      Day {post.tick}
                    </Text>
                    <Text size="sm" mb="xs">
                      {post.content}
                    </Text>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">
                        ❤️ {post.likes}
                      </Text>
                      <Text size="xs" c="dimmed">
                        🔁 {post.retweets}
                      </Text>
                      <Text size="xs" c="dimmed">
                        📊 {(post.engagement * 100).toFixed(1)}%
                      </Text>
                    </Group>
                    {post.type === 'analysis' && !post.resolved && (
                      <Badge size="sm" color="blue" variant="light" mt="xs">
                        Pending
                      </Badge>
                    )}
                    {post.resolved && post.type === 'analysis' && (
                      <Badge
                        size="sm"
                        color={post.correct ? 'green' : 'red'}
                        variant="light"
                        mt="xs"
                      >
                        {post.correct ? 'Correct ✅' : 'Wrong ❌'}
                      </Badge>
                    )}
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
