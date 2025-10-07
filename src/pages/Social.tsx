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
  Badge,
  Timeline,
  Progress,
  ActionIcon,
  Loader,
  Autocomplete,
} from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { useState, useMemo, useEffect } from 'react';
import { formatNumber } from '../utils/format';
import { IconCheck, IconX, IconClock, IconTrendingUp, IconTrendingDown, IconSparkles, IconWand } from '@tabler/icons-react';
import { parseMentions } from '../utils/socialMentions';
import { computeReactions } from '../utils/socialReactions';

export default function Social() {
  const {
    social,
    posts: socialPosts,
    assets,
    list,
    day,
    createPost,
    calculateInfluence,
    profile,
    saveGame,
    checkPostTriggers,
  } = useStore();

  const [content, setContent] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');

  // Check for post triggers on page load and every minute while on the social page
  useEffect(() => {
    // Run immediately on mount
    checkPostTriggers();

    // Then run every minute
    const interval = setInterval(() => {
      checkPostTriggers();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [checkPostTriggers]);

  const influence = calculateInfluence();

  // Calculate dynamic engagement based on time, followers, influence, and accuracy
  const calculateDynamicEngagement = (post: any) => {
    const elapsedMs = Date.now() - post.postedAt;
    const elapsedMinutes = elapsedMs / 60000;

    // Base engagement from initial calculation
    const baseLikes = post.likes;
    const baseReach = post.reach;

    // Time multiplier (engagement grows over time, plateaus after 1 day)
    let timeMultiplier = 1.0;
    if (elapsedMinutes < 1) {
      timeMultiplier = 0.1; // 10% at < 1 min
    } else if (elapsedMinutes < 5) {
      timeMultiplier = 0.3; // 30% at < 5 min
    } else if (elapsedMinutes < 30) {
      timeMultiplier = 0.6; // 60% at < 30 min
    } else if (elapsedMinutes < 60) {
      timeMultiplier = 0.8; // 80% at < 1 hour
    } else if (elapsedMinutes < 1440) {
      // 1 day
      timeMultiplier = 1.0 + (elapsedMinutes / 1440) * 0.5; // 100-150% over first day
    } else {
      timeMultiplier = 1.5; // Cap at 150%
    }

    // Accuracy multiplier (if post mentions coins, check performance)
    let accuracyMultiplier = 1.0;
    if (post.targets.length > 0) {
      let totalReturn = 0;
      let validTargets = 0;

      post.targets.forEach((symbol: string) => {
        const asset = assets[symbol];
        if (asset && post.entryPrices[symbol]) {
          const priceReturn = (asset.price - post.entryPrices[symbol]) / post.entryPrices[symbol];
          totalReturn += priceReturn;
          validTargets++;
        }
      });

      if (validTargets > 0) {
        const avgReturn = totalReturn / validTargets;

        // Bullish posts rewarded for positive returns
        if (post.sentiment === 'bullish') {
          accuracyMultiplier = avgReturn > 0 ? 1 + avgReturn * 2 : 1 + avgReturn; // 2x boost for gains, 1x penalty for losses
        }
        // Bearish posts rewarded for negative returns
        else if (post.sentiment === 'bearish') {
          accuracyMultiplier = avgReturn < 0 ? 1 - avgReturn * 2 : 1 + avgReturn; // 2x boost for drops, 1x penalty for gains
        }
        // Neutral posts unaffected
        else {
          accuracyMultiplier = 1.0;
        }

        // Cap multiplier between 0.3x and 3x
        accuracyMultiplier = Math.max(0.3, Math.min(3.0, accuracyMultiplier));
      }
    }

    // Calculate final engagement
    const finalLikes = Math.floor(baseLikes * timeMultiplier * accuracyMultiplier);
    const finalReach = Math.floor(baseReach * timeMultiplier * accuracyMultiplier);
    const finalRetweets = Math.floor(finalReach / 10);

    return { likes: finalLikes, reach: finalReach, retweets: finalRetweets };
  };

  // Get comments from saved data (AI comments only)
  const getPostComments = (post: any) => {
    const comments: Array<{ handle: string; text: string }> = [];

    // Only show AI-generated comments from commentPack
    if (post.commentsShown && post.commentsShown.length > 0) {
      post.commentsShown.forEach((comment: any, idx: number) => {
        comments.push({
          handle: comment.handle || `@crypto_whale${idx + 1}`,
          text: comment.text,
        });
      });
    }

    return comments;
  };

  // Get available crypto symbols for autocomplete
  const cryptoSymbols = useMemo(() => {
    return list
      .map((id) => assets[id])
      .filter((a) => a && !a.rugged)
      .map((a) => ({ value: a.symbol, label: `${a.symbol} - ${a.name}` }));
  }, [list, assets]);

  const handleContentChange = (value: string) => {
    setContent(value);

    // Check if user just typed @ or $
    const cursorPos = value.length;
    const lastChar = value[cursorPos - 1];
    const beforeLastChar = value[cursorPos - 2];

    if ((lastChar === '@' || lastChar === '$') && (!beforeLastChar || /\s/.test(beforeLastChar))) {
      setShowMentions(true);
      setMentionSearch('');
    } else if (showMentions) {
      // Extract search term after @ or $
      const match = value.slice(0, cursorPos).match(/[@$]([A-Z0-9]*)$/i);
      if (match) {
        setMentionSearch(match[1].toUpperCase());
      } else {
        setShowMentions(false);
      }
    }
  };

  const insertMention = (symbol: string) => {
    // Replace the partial mention with the full symbol
    const regex = /[@$][A-Z0-9]*$/i;
    const newContent = content.replace(regex, `$${symbol} `);
    setContent(newContent);
    setShowMentions(false);
  };

  const handleImprove = async () => {
    if (!content.trim()) return;
    setIsImproving(true);
    try {
      const seed = useStore.getState().seed;
      const originalText = content.trim();

      const response = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentText: originalText,
          seed,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Improve] Response:', data);

      // Check if API actually improved the text
      if (data.content === originalText) {
        alert('⚠️ AI Improve is not working!\n\nThe API returned unchanged text. This means:\n• CLAUDE_API_KEY is not set in server/.env\n• Or the Claude API is not responding\n\nFallback mode is active (returns original text).');
      }

      // API returns { content: "improved text", _meta: {...} }
      setContent(data.content || content);
    } catch (err) {
      console.error('Improve failed:', err);
      alert(`❌ AI Improve failed!\n\nError: ${err instanceof Error ? err.message : 'Unknown error'}\n\nCheck:\n• Server is running on port 3001\n• CLAUDE_API_KEY is set in server/.env`);
    } finally {
      setIsImproving(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() || isPosting) return;

    setIsPosting(true);
    const mentions = parseMentions(content);
    const seed = `${Date.now()}-${Math.random()}`;

    try {
      // Posts without mentions: simplified flow
      if (mentions.length === 0) {
        // Simple post without AI classification
        const baseReactions = computeReactions(
          'update',
          social.followers,
          influence,
          0.3 // Low base engagement for mention-free posts
        );

        createPost({
          textRaw: content,
          textFinal: content,
          targets: [],
          category: 'update',
          sentiment: 'neutral',
          horizonDays: 0,
          commentPack: { positive: [], negative: [], neutral: [], verdict: [] },
          likes: Math.floor(baseReactions.likes * 0.5), // 50% penalty
          emojis: baseReactions.emojis,
          reach: Math.floor(baseReactions.reach * 0.5), // 50% penalty
          qualityHints: { engagement: 0.3, authenticity: 0.5 },
          seed,
          entryPrices: {},
        });

        await saveGame();
        setContent('');
        setIsPosting(false);
        return;
      }

      // Posts with mentions: full AI flow
      const response = await fetch('/api/ai/classify-and-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, mentions, seed }),
      });
      const aiData = await response.json();

      // Compute local reactions
      const reactions = computeReactions(
        aiData.category,
        social.followers,
        influence,
        aiData.qualityHints.engagement
      );

      // Record entry prices
      const entryPrices: Record<string, number> = {};
      mentions.forEach((symbol) => {
        const asset = assets[symbol];
        if (asset) {
          entryPrices[symbol] = asset.price;
        }
      });

      // Create post in store
      createPost({
        textRaw: content,
        textFinal: content,
        targets: mentions,
        category: aiData.category,
        sentiment: aiData.sentiment,
        horizonDays: aiData.horizonDays,
        commentPack: aiData.commentPack,
        likes: reactions.likes,
        emojis: reactions.emojis,
        reach: reactions.reach,
        qualityHints: aiData.qualityHints,
        seed,
        entryPrices,
      });

      await saveGame();

      // Reset form
      setContent('');
    } catch (err) {
      console.error('Post failed:', err);
      alert('Failed to post. Check console for details.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      {/* Header with profile */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={1} c="terminal.5">
            HYPEWIRE
          </Title>
          <Text size="sm" c="dimmed">
            The degen's social network
          </Text>
        </div>
        <Paper p="sm" withBorder>
          <Group gap="xs">
            <Text size="sm" fw={700} c="terminal.5" ff="monospace">
              @{profile?.handle || 'anon'}
            </Text>
            <Text size="xs" c="dimmed">•</Text>
            <Text size="xs" c="dimmed">
              {formatNumber(social.followers, 0)} followers
            </Text>
          </Group>
        </Paper>
      </Group>

      {/* Post Composer */}
      <Paper p="md" withBorder mb="md">
        <Group gap="sm" mb="md">
          <Paper
            p="xs"
            withBorder
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--mantine-color-terminal-9)',
            }}
          >
            <Text size="lg" fw={700}>
              {(profile?.handle || 'A').charAt(0).toUpperCase()}
            </Text>
          </Paper>
          <div style={{ flex: 1 }}>
            <Text size="sm" fw={700}>
              @{profile?.handle || 'anon'}
            </Text>
            <Text size="xs" c="dimmed">
              {profile?.title || 'Crypto Trader'}
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          {/* Textarea */}
          <Textarea
            placeholder="What's happening in crypto?"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            minRows={3}
            maxRows={6}
            autosize
            styles={{
              input: {
                fontSize: '15px',
              },
            }}
          />
          <Text size="xs" c="dimmed">
            💡 Tip: Mention coins with $BTC or $ETH for better engagement
          </Text>

          {/* Mention suggestions dropdown */}
          {showMentions && (
            <Paper p="xs" withBorder style={{ position: 'absolute', zIndex: 1000, marginTop: '150px', maxWidth: '300px' }}>
              <Stack gap="xs">
                {cryptoSymbols
                  .filter((c) => c.value.startsWith(mentionSearch))
                  .slice(0, 5)
                  .map((crypto) => (
                    <Button
                      key={crypto.value}
                      variant="subtle"
                      size="xs"
                      onClick={() => insertMention(crypto.value)}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      ${crypto.value} - {crypto.label.split(' - ')[1]}
                    </Button>
                  ))}
              </Stack>
            </Paper>
          )}

          {/* Action buttons */}
          <Group gap="xs">
            <Button
              leftSection={isImproving ? <Loader size="xs" /> : <IconWand size={16} />}
              variant="light"
              color="blue"
              onClick={handleImprove}
              disabled={!content.trim() || isImproving || isPosting}
            >
              Improve
            </Button>
            <Button
              leftSection={isPosting ? <Loader size="xs" /> : undefined}
              color="terminal.5"
              onClick={handlePost}
              disabled={!content.trim() || isPosting}
              style={{ marginLeft: 'auto' }}
            >
              {isPosting ? 'Posting...' : 'Post'}
            </Button>
          </Group>

          {/* Post fatigue warning */}
          {social.postsToday >= 2 && (
            <Text size="sm" c="yellow">
              ⚠️ Posting {social.postsToday + 1} times today. Engagement will be reduced.
            </Text>
          )}
        </Stack>
      </Paper>

      {/* Feed */}
      <Paper p="md" withBorder>
        <Text size="sm" fw={700} mb="md" c="terminal.5" tt="uppercase">
          Your Feed
        </Text>

        {socialPosts.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No posts yet. Start posting!
          </Text>
        )}

        <Stack gap="sm">
          {socialPosts.slice(0, 20).map((post) => (
            <Paper key={post.id} p="md" withBorder>
              {/* Post header */}
              <Group gap="sm" mb="sm">
                <Paper
                  p="xs"
                  withBorder
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--mantine-color-dark-6)',
                  }}
                >
                  <Text size="sm" fw={700}>
                    {(profile?.handle || 'A').charAt(0).toUpperCase()}
                  </Text>
                </Paper>
                <div style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text size="sm" fw={700}>
                      @{profile?.handle || 'anon'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      • {(() => {
                        const daysAgo = day - post.day;
                        if (daysAgo === 0) return 'Today';
                        if (daysAgo === 1) return '1 day ago';
                        return `${daysAgo} days ago`;
                      })()}
                    </Text>
                    {post.sentiment && (
                      <Badge
                        size="xs"
                        variant="dot"
                        color={
                          post.sentiment === 'bullish'
                            ? 'green'
                            : post.sentiment === 'bearish'
                            ? 'red'
                            : 'gray'
                        }
                      >
                        {post.sentiment}
                      </Badge>
                    )}
                  </Group>
                </div>
              </Group>

              {/* Post content */}
              <Text size="sm" mb="sm" style={{ lineHeight: 1.5 }}>
                {post.textFinal}
              </Text>

              {/* Crypto tags */}
              {post.targets.length > 0 && (
                <Group gap="xs" mb="sm">
                  {post.targets.map((symbol) => (
                    <Badge key={symbol} size="sm" variant="light" color="terminal.5">
                      ${symbol}
                    </Badge>
                  ))}
                </Group>
              )}

              {/* Engagement stats - dynamic based on time and accuracy */}
              {(() => {
                const elapsedMs = Date.now() - post.postedAt;
                const elapsedMinutes = elapsedMs / 60000;

                // Don't show engagement for very new posts (< 1 min)
                if (elapsedMinutes < 1) {
                  return null;
                }

                const engagement = calculateDynamicEngagement(post);

                return (
                  <Group gap="lg">
                    <Group gap={4}>
                      <Text size="xs" c="dimmed">
                        ❤️
                      </Text>
                      <Text size="xs" fw={500}>
                        {formatNumber(engagement.likes, 0)}
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <Text size="xs" c="dimmed">
                        🔁
                      </Text>
                      <Text size="xs" fw={500}>
                        {formatNumber(engagement.retweets, 0)}
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <Text size="xs" c="dimmed">
                        👁️
                      </Text>
                      <Text size="xs" fw={500}>
                        {formatNumber(engagement.reach, 0)}
                      </Text>
                    </Group>
                    {post.emojis.length > 0 && (
                      <Text size="xs">
                        {post.emojis.slice(0, 3).map((e) => e.emoji).join(' ')}
                      </Text>
                    )}
                  </Group>
                );
              })()}

              {/* Comments - from saved data */}
              {(() => {
                const comments = getPostComments(post);

                if (comments.length === 0) return null;

                return (
                  <Stack gap="sm" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
                    {comments.map((comment, idx) => (
                      <Group key={idx} gap="sm" align="flex-start">
                        <Paper
                          p="xs"
                          withBorder
                          style={{
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--mantine-color-dark-6)',
                            flexShrink: 0,
                          }}
                        >
                          <Text size="xs" fw={700}>
                            {comment.handle.replace('@', '').charAt(0).toUpperCase()}
                          </Text>
                        </Paper>
                        <div style={{ flex: 1 }}>
                          <Text size="xs" fw={600} mb={2}>
                            {comment.handle}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {comment.text}
                          </Text>
                        </div>
                      </Group>
                    ))}
                  </Stack>
                );
              })()}
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
}
