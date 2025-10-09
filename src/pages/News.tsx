import { Container, Title, Paper, Text, Group, Stack, Badge, Tabs, ScrollArea, Divider } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { NewsArticle } from '../engine/types';

const CATEGORY_COLORS: Record<string, string> = {
  market: 'blue',
  security: 'red',
  prediction: 'violet',
  launch: 'green',
  technology: 'cyan',
  regulation: 'orange',
};

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: 'green',
  bearish: 'red',
  neutral: 'gray',
};

function NewsCard({ article }: { article: NewsArticle }) {
  const { assets } = useStore();
  const asset = assets[article.assetId];

  return (
    <Paper p="md" withBorder mb="md" style={{ borderLeft: `4px solid var(--mantine-color-${CATEGORY_COLORS[article.category] || 'gray'}-6)` }}>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Text size="lg" fw={600}>
              {article.headline}
            </Text>
            <Group gap="xs">
              <Badge size="xs" color={CATEGORY_COLORS[article.category] || 'gray'} variant="light">
                {article.category.toUpperCase()}
              </Badge>
              <Badge size="xs" color={SENTIMENT_COLORS[article.sentiment]} variant="dot">
                {article.sentiment}
              </Badge>
              {article.isFake && (
                <Badge size="xs" color="yellow" variant="filled">
                  UNVERIFIED
                </Badge>
              )}
              {article.debunkedDay && (
                <Badge size="xs" color="red" variant="filled">
                  DEBUNKED
                </Badge>
              )}
            </Group>
          </Stack>
          <Stack gap={0} align="flex-end">
            <Text size="sm" c="dimmed">
              Day {article.day}
            </Text>
            {asset && (
              <Text size="xs" c="terminal.5" fw={600} ff="monospace">
                ${asset.symbol}
              </Text>
            )}
          </Stack>
        </Group>

        {article.debunkedDay && (
          <Text size="sm" c="red" fs="italic">
            ⚠️ This article was debunked on Day {article.debunkedDay} as misinformation
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

export default function News() {
  const { articles, day } = useStore();

  // Sort articles by day (newest first)
  const sortedArticles = [...articles].sort((a, b) => b.day - a.day);

  // Filter by category
  const categories = ['all', 'market', 'security', 'prediction', 'launch', 'technology', 'regulation'];

  const getArticlesByCategory = (category: string) => {
    if (category === 'all') return sortedArticles;
    return sortedArticles.filter((a) => a.category === category);
  };

  return (
    <Container size="xl" py="xl">
      {/* Header with satirical elements */}
      <Stack gap="md" mb="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={1} c="terminal.5" ff="monospace">
              CRYPTO DAILY NEWS
            </Title>
            <Text size="sm" c="dimmed" fs="italic">
              "Fair and Balanced™ Crypto Coverage" - Day {day}
            </Text>
          </Stack>
          <Paper p="xs" withBorder bg="dark.8">
            <Stack gap={0}>
              <Text size="xs" c="dimmed" tt="uppercase">
                Sponsored by
              </Text>
              <Text size="sm" fw={700} c="green">
                MoonSwap Finance
              </Text>
              <Text size="xs" c="dimmed">
                (Not Financial Advice)
              </Text>
            </Stack>
          </Paper>
        </Group>

        <Divider />

        {/* Satirical Ticker */}
        <Paper p="xs" bg="dark.7" withBorder>
          <Text size="xs" c="dimmed" ff="monospace">
            🔴 BREAKING: Whale moves 0.01 BTC • 🚨 Analyst predicts price will go up OR down • 💎 New whitepaper promises to "disrupt everything" • ⚠️ Regulations may or may not happen
          </Text>
        </Paper>
      </Stack>

      {/* Tabs for categories */}
      <Tabs defaultValue="all" variant="pills">
        <Tabs.List mb="md">
          {categories.map((cat) => (
            <Tabs.Tab key={cat} value={cat}>
              {cat === 'all' ? 'All News' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              {cat !== 'all' && (
                <Badge size="xs" ml="xs" variant="light">
                  {getArticlesByCategory(cat).length}
                </Badge>
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {categories.map((cat) => (
          <Tabs.Panel key={cat} value={cat}>
            <ScrollArea h={600}>
              {getArticlesByCategory(cat).length === 0 ? (
                <Paper p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No {cat === 'all' ? '' : cat} news articles yet
                  </Text>
                </Paper>
              ) : (
                getArticlesByCategory(cat).map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))
              )}
            </ScrollArea>
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Satirical Footer */}
      <Divider my="xl" />
      <Stack gap="xs">
        <Text size="xs" c="dimmed" ta="center">
          Crypto Daily News™ - Pumping narratives since Day 1
        </Text>
        <Text size="xs" c="dimmed" ta="center" fs="italic">
          Disclaimer: All articles may or may not be accurate. DYOR. NFA. Probably nothing.
        </Text>
      </Stack>
    </Container>
  );
}
