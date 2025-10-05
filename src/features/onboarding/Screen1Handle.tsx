import { useState } from 'react';
import { Stack, Title, Text, TextInput, Button, Select, Chip, Group, Paper, Box } from '@mantine/core';
import { useStore } from '../../stores/rootStore';

const TITLES = [
  'Rug Baron',
  'Meme Mogul',
  'Shillmaster General',
  'Airdrop Bandit',
  'Minister of Liquidity',
  'Whale Whisperer',
  'Pumpeteer',
  'Exit Scam Survivor',
  'Diamond Hand Duke',
  'Ser Degen',
];

const HANDLE_WORDS_1 = ['Moon', 'Alpha', 'Chain', 'Ape', 'Wen', 'Whale', 'Gas', 'Laser', 'Degen', 'Giga'];
const HANDLE_WORDS_2 = ['Pilot', 'Cartel', 'Wizard', 'Mechanic', 'Cleric', 'Nomad', 'Baron', 'Lord', 'Chad', 'Ser'];
const HANDLE_SUFFIXES = ['69', '420', '9000', '42', '100x', 'GM', 'LFG'];

export default function Screen1Handle() {
  const { handle, alias, title, toggle, setHandle, setAlias, setTitle, setToggle, setScreen } = useStore();
  const [error, setError] = useState('');

  const generateHandle = () => {
    const word1 = HANDLE_WORDS_1[Math.floor(Math.random() * HANDLE_WORDS_1.length)];
    const word2 = HANDLE_WORDS_2[Math.floor(Math.random() * HANDLE_WORDS_2.length)];
    const suffix = HANDLE_SUFFIXES[Math.floor(Math.random() * HANDLE_SUFFIXES.length)];
    setHandle(`${word1}${word2}${suffix}`);
    setError('');
  };

  const validateHandle = (value: string) => {
    if (value.length < 3) {
      return 'Needs at least 3 chars. Even $PEPE had a plan.';
    }
    if (value.length > 20) {
      return 'Save it for a whitepaper.';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return "Smart contracts don't like that.";
    }
    return '';
  };

  const handleHandleChange = (value: string) => {
    setHandle(value);
    const error = validateHandle(value);
    setError(error);
  };

  const handleNext = () => {
    const error = validateHandle(handle);
    if (error) {
      setError(error);
      return;
    }
    setScreen(2);
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
          maxWidth: '600px',
          width: '100%',
          background: 'rgba(11, 14, 18, 0.95)',
          borderColor: 'rgba(0, 255, 0, 0.3)',
        }}
      >
        <Stack gap="lg">
          {/* Header */}
          <Box>
            <Title order={2} c="terminal.5" ff="monospace" mb="xs">
              Claim your @Handle
            </Title>
            <Text size="sm" c="dimmed">
              (before some degen squats it)
            </Text>
          </Box>

          {/* Handle Input */}
          <Stack gap="xs">
            <TextInput
              label="Handle (public)"
              placeholder="@________"
              value={handle}
              onChange={(e) => handleHandleChange(e.currentTarget.value)}
              error={error}
              leftSection="@"
              size="md"
              styles={{
                label: {
                  color: 'var(--mantine-color-dimmed)',
                },
                input: {
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                },
              }}
            />

            <Group gap="xs">
              <Button size="xs" variant="light" color="terminal.5" onClick={generateHandle}>
                🎲 Spin a Handle
              </Button>
              {handle && !error && (
                <Text size="xs" c="dimmed" ff="monospace">
                  Available! 🚀
                </Text>
              )}
            </Group>
          </Stack>

          {/* Alias Input */}
          <TextInput
            label="Alias (shadow name, optional)"
            placeholder="For shady events and OTC DMs"
            value={alias}
            onChange={(e) => setAlias(e.currentTarget.value)}
            size="md"
            styles={{
              label: {
                color: 'var(--mantine-color-dimmed)',
              },
              input: {
                fontFamily: 'monospace',
              },
            }}
          />

          {/* Title Select */}
          <Select
            label="Pronounced Title"
            value={title}
            onChange={(value) => setTitle(value || 'Rug Baron')}
            data={TITLES}
            size="md"
            comboboxProps={{ transitionProps: { transition: 'fade', duration: 200 } }}
            styles={{
              label: {
                color: 'var(--mantine-color-dimmed)',
              },
            }}
          />

          {/* Flavor Toggles */}
          <Box>
            <Text size="sm" fw={500} mb="xs" c="dimmed">
              Starting Vibe
            </Text>
            <Chip.Group value={toggle || ''} onChange={(val) => setToggle((val as any) || null)}>
              <Group gap="xs">
                <Chip value="diamond-hands" color="terminal.5" variant="light">
                  Diamond Hands ✋💎
                </Chip>
                <Chip value="paper-hands" color="yellow" variant="light">
                  Paper Hands 🧻
                </Chip>
                <Chip value="anon-mask" color="blue" variant="light">
                  Anon Mask 🕶️
                </Chip>
              </Group>
            </Chip.Group>

            <Text size="xs" c="dimmed" mt="xs">
              {toggle === 'diamond-hands' && '+Reputation, −Cash start'}
              {toggle === 'paper-hands' && '+Cash, −Reputation start'}
              {toggle === 'anon-mask' && '+Security, −Influence start'}
              {!toggle && 'Balanced start'}
            </Text>
          </Box>

          {/* CTA */}
          <Button fullWidth size="lg" color="terminal.5" onClick={handleNext} disabled={!handle || !!error}>
            Send It 🚀
          </Button>

          {/* Footer */}
          <Text size="xs" c="dimmed" ta="center" fs="italic">
            By proceeding you accept the Terms of Vibes, the DAO of Chaos, and the Universal Law of Number Go Up (Or
            Down).
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}
