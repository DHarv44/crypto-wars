import { Stack, Title, Text, Paper, Grid, Box, Button, Badge, Group } from '@mantine/core';
import { useStore } from '../../stores/rootStore';
import type { Archetype } from './onboardingSlice';

const ARCHETYPES: Array<{
  id: Archetype;
  name: string;
  emoji: string;
  tagline: string;
  stats: string[];
  description: string;
  color: string;
}> = [
  {
    id: 'meme-mogul',
    name: 'Meme Mogul',
    emoji: '📱',
    tagline: 'You post, numbers pump, morals dump.',
    stats: ['Followers +8k', 'Engagement ↑', 'Authenticity ↓'],
    description: 'Start with a cult following. Every shill moves markets. Ethics sold separately.',
    color: '#FF3FA4',
  },
  {
    id: 'rug-academic',
    name: 'Rug Academic',
    emoji: '🔬',
    tagline: 'You read audits. The chain reads you.',
    stats: ['Security ++', 'Reputation ↑', 'Followers ↓'],
    description: 'Scholar of scams. Audits cost 20% less. Governments trust you (for now).',
    color: '#2EE6D6',
  },
  {
    id: 'otc-fixer',
    name: 'OTC Fixer',
    emoji: '🤝',
    tagline: 'Back rooms, front profits.',
    stats: ['Cash ↑', 'Influence ↑', 'Scrutiny ↑'],
    description: 'Connected. Whale OTC deals favor you. Ministers know your number.',
    color: '#D1FF5C',
  },
  {
    id: 'bot-rancher',
    name: 'Bot Rancher',
    emoji: '🤖',
    tagline: 'Farms likes. Harvests exit liquidity.',
    stats: ['Exposure ++', 'Engagement ↑', 'Authenticity ↓↓'],
    description: 'Automation expert. Wash trading costs 25% less. Authenticity is overrated.',
    color: '#FFB84D',
  },
];

export default function Screen2Archetype() {
  const { archetype, setArchetype, setScreen } = useStore();

  const handleSelect = (id: Archetype) => {
    setArchetype(id);
  };

  const handleNext = () => {
    if (!archetype) return;
    setScreen(3);
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
      <Box style={{ maxWidth: '900px', width: '100%' }}>
        <Stack gap="xl">
          {/* Header */}
          <Box ta="center">
            <Title order={2} c="terminal.5" ff="monospace" mb="xs">
              Choose your grind.
            </Title>
            <Text size="sm" c="dimmed">
              None of this is wholesome.
            </Text>
          </Box>

          {/* Archetype Cards */}
          <Grid gutter="md">
            {ARCHETYPES.map((arch) => {
              const isSelected = archetype === arch.id;

              return (
                <Grid.Col key={arch.id} span={{ base: 12, sm: 6 }}>
                  <Paper
                    p="lg"
                    withBorder
                    onClick={() => handleSelect(arch.id)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(0, 255, 0, 0.1)' : 'rgba(11, 14, 18, 0.95)',
                      borderColor: isSelected ? arch.color : 'rgba(0, 255, 0, 0.3)',
                      borderWidth: isSelected ? '2px' : '1px',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'translateY(-4px) rotate(0.5deg)';
                        e.currentTarget.style.borderColor = arch.color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'translateY(0) rotate(0deg)';
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 0, 0.3)';
                      }
                    }}
                  >
                    {/* Emoji Badge */}
                    <Box
                      style={{
                        fontSize: '3rem',
                        textAlign: 'center',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {arch.emoji}
                    </Box>

                    {/* Name */}
                    <Title order={4} ta="center" mb="xs" c={arch.color} ff="monospace">
                      {arch.name}
                    </Title>

                    {/* Tagline */}
                    <Text size="sm" ta="center" c="dimmed" fs="italic" mb="md">
                      "{arch.tagline}"
                    </Text>

                    {/* Stats */}
                    <Group justify="center" gap="xs" mb="md">
                      {arch.stats.map((stat, i) => (
                        <Badge key={i} size="xs" variant="light" color="gray">
                          {stat}
                        </Badge>
                      ))}
                    </Group>

                    {/* Description */}
                    <Text size="xs" ta="center" c="dimmed">
                      {arch.description}
                    </Text>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                        }}
                      >
                        <Badge size="sm" color="terminal.5" variant="filled">
                          ✓ Selected
                        </Badge>
                      </Box>
                    )}
                  </Paper>
                </Grid.Col>
              );
            })}
          </Grid>

          {/* CTA */}
          <Button fullWidth size="lg" color="terminal.5" onClick={handleNext} disabled={!archetype}>
            {archetype ? 'Lock It In 🔒' : 'Pick Your Poison'}
          </Button>

          {/* Back */}
          <Button variant="subtle" onClick={() => setScreen(1)}>
            ← Back
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
