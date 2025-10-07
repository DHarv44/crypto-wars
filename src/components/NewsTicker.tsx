import { Paper, Text, Box } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { Newspaper, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NewsTicker() {
  const { getRecentNews, day, assets } = useStore();
  const navigate = useNavigate();
  const allNews = getRecentNews(50);

  // Only show news from last 5 days
  const recentNews = allNews.filter(article => {
    const daysAgo = day - article.day;
    return daysAgo <= 5;
  }).slice(0, 10);

  if (recentNews.length === 0) {
    return null;
  }

  const getSentimentColor = (sentiment: string, isFake: boolean, debunked: boolean) => {
    if (debunked) return 'var(--mantine-color-dimmed)';
    if (isFake) return 'var(--mantine-color-yellow-6)';
    if (sentiment === 'bullish') return 'var(--mantine-color-teal-6)';
    if (sentiment === 'bearish') return 'var(--mantine-color-red-6)';
    return 'var(--mantine-color-gray-5)';
  };

  const getIcon = (isFake: boolean) => {
    if (isFake) return <AlertTriangle size={14} style={{ marginRight: 4 }} />;
    return <Newspaper size={14} style={{ marginRight: 4 }} />;
  };

  const getRelativeTime = (articleDay: number, currentDay: number) => {
    const daysAgo = currentDay - articleDay;
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo === 2) return '2 days ago';
    if (daysAgo === 3) return '3 days ago';
    if (daysAgo === 4) return '4 days ago';
    if (daysAgo === 5) return '5 days ago';
    return `${daysAgo} days ago`;
  };

  return (
    <Paper p="sm" withBorder style={{ overflow: 'hidden', backgroundColor: 'var(--mantine-color-dark-7)' }}>
      <style>
        {`
          @keyframes newsScroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
        `}
      </style>
      <Box style={{ position: 'relative', width: '100%', height: '28px', overflow: 'hidden' }}>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            animation: 'newsScroll 42s linear infinite',
            gap: '3rem',
          }}
        >
          {recentNews.map((article) => {
            const debunked = !!article.debunkedDay;
            const color = getSentimentColor(article.sentiment, article.isFake, debunked);

            return (
              <Box
                key={article.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/symbol/${article.assetSymbol}`)}
              >
                <Box style={{ color, display: 'flex', alignItems: 'center' }}>
                  {getIcon(article.isFake && !debunked)}
                </Box>
                <Text
                  size="sm"
                  fw={article.isFake && !debunked ? 600 : 500}
                  style={{
                    color,
                    textDecoration: debunked ? 'line-through' : 'none',
                    opacity: debunked ? 0.6 : 1,
                  }}
                >
                  {debunked && '[DEBUNKED] '}
                  {article.headline}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {getRelativeTime(article.day, day)}
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: 'var(--mantine-color-dark-6)',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/symbol/${article.assetSymbol}`);
                  }}
                >
                  {article.assetSymbol}
                </Text>
              </Box>
            );
          })}
          {/* Duplicate for seamless loop */}
          {recentNews.map((article) => {
            const debunked = !!article.debunkedDay;
            const color = getSentimentColor(article.sentiment, article.isFake, debunked);

            return (
              <Box
                key={`${article.id}-duplicate`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/symbol/${article.assetSymbol}`)}
              >
                <Box style={{ color, display: 'flex', alignItems: 'center' }}>
                  {getIcon(article.isFake && !debunked)}
                </Box>
                <Text
                  size="sm"
                  fw={article.isFake && !debunked ? 600 : 500}
                  style={{
                    color,
                    textDecoration: debunked ? 'line-through' : 'none',
                    opacity: debunked ? 0.6 : 1,
                  }}
                >
                  {debunked && '[DEBUNKED] '}
                  {article.headline}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {getRelativeTime(article.day, day)}
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: 'var(--mantine-color-dark-6)',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/symbol/${article.assetSymbol}`);
                  }}
                >
                  {article.assetSymbol}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}
