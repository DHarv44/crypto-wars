import { Stack, Title, Text, Button, Paper, Group, Box } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useStore } from '../../stores/rootStore';
import { getAllProfiles, loadProfile, deleteProfile } from '../../utils/storage';
import { SavedGame } from '../../utils/storage';

const ARCHETYPE_EMOJI: Record<string, string> = {
  'meme-mogul': '📱',
  'rug-academic': '🔬',
  'otc-fixer': '🤝',
  'bot-rancher': '🤖',
};

export default function ScreenProfileSelect() {
  const { setScreen } = useStore();
  const profiles = getAllProfiles();
  const activeProfileId = localStorage.getItem('crypto-wars-active-profile');

  console.log('ScreenProfileSelect - profiles:', profiles);
  console.log('ScreenProfileSelect - localStorage crypto-wars-games:', localStorage.getItem('crypto-wars-games'));
  console.log('ScreenProfileSelect - active profile ID:', activeProfileId);

  const activeProfile = profiles.find(p => p.playerProfile.id === activeProfileId);
  const otherProfiles = profiles.filter(p => p.playerProfile.id !== activeProfileId);

  const handleContinue = () => {
    if (activeProfile) {
      loadProfile(activeProfile.playerProfile.id);
    }
  };

  const handleLoadProfile = (id: string) => {
    loadProfile(id);
  };

  const handleNewProfile = () => {
    setScreen(1); // Go to handle screen
  };

  const handleDeleteProfile = (id: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete profile @${handle}?`)) {
      deleteProfile(id);
      // Reload to update UI
      window.location.reload();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCash = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #000000 0%, #0B0E12 100%)',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack gap="xl" style={{ maxWidth: 600, width: '100%' }}>
        <Stack gap="xs" align="center">
          <Title
            order={1}
            size="2.5rem"
            ff="monospace"
            c="terminal.5"
            style={{
              textShadow: '0 0 20px #00ff00',
            }}
          >
            SELECT PROFILE
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            Continue your hustle or start fresh
          </Text>
        </Stack>

        <Stack gap="md">
          {/* Continue with active profile */}
          {activeProfile && (
            <Paper
              p="xl"
              withBorder
              style={{
                borderColor: 'var(--mantine-color-terminal-5)',
                backgroundColor: 'var(--mantine-color-dark-6)',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="md">
                    <Text size="3rem">
                      {ARCHETYPE_EMOJI[activeProfile.playerProfile.archetype] || '🎮'}
                    </Text>
                    <Stack gap="xs">
                      <Text size="lg" fw={700} ff="monospace" c="terminal.5">
                        @{activeProfile.playerProfile.handle}
                      </Text>
                      {activeProfile.playerProfile.alias && (
                        <Text size="sm" c="dimmed" fs="italic">
                          ({activeProfile.playerProfile.alias})
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {activeProfile.playerProfile.title} • {activeProfile.playerProfile.archetype.replace(/-/g, ' ')}
                      </Text>
                    </Stack>
                  </Group>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={(e) => handleDeleteProfile(activeProfile.playerProfile.id, activeProfile.playerProfile.handle, e)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>
                <Button
                  size="xl"
                  color="terminal.5"
                  onClick={handleContinue}
                  fullWidth
                >
                  Continue as @{activeProfile.playerProfile.handle}
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Other profiles */}
          {otherProfiles.length > 0 && (
            <>
              <Text size="sm" c="dimmed" ta="center" mt="lg">
                Switch to another profile
              </Text>
              {otherProfiles.map((profile: SavedGame) => {
            // Safety check - skip profiles with missing gameState
            if (!profile.gameState) {
              return null;
            }

            return (
              <Paper
                key={profile.playerProfile.id}
                p="lg"
                withBorder
                style={{
                  cursor: 'pointer',
                  borderColor: 'var(--mantine-color-dark-4)',
                  backgroundColor: 'var(--mantine-color-dark-7)',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleLoadProfile(profile.playerProfile.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--mantine-color-terminal-5)';
                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--mantine-color-dark-4)';
                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-7)';
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <Text size="2rem">
                      {ARCHETYPE_EMOJI[profile.playerProfile.archetype] || '🎮'}
                    </Text>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group gap="sm">
                        <Text size="xl" fw={700} ff="monospace" c="terminal.5">
                          @{profile.playerProfile.handle}
                        </Text>
                        {profile.playerProfile.alias && (
                          <Text size="sm" c="dimmed" fs="italic">
                            ({profile.playerProfile.alias})
                          </Text>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed">
                        {profile.playerProfile.title} • {profile.playerProfile.archetype.replace(/-/g, ' ')}
                      </Text>
                      {profile.gameState && (
                        <Group gap="xl">
                          <Text size="sm" c="terminal.5">
                            {formatCash(profile.gameState.cashUSD || 0)}
                          </Text>
                          <Text size="sm" c="dimmed">
                            Net Worth: {formatCash(profile.gameState.netWorthUSD || 0)}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {(profile.gameState.influencer?.followers || 0).toLocaleString()} followers
                          </Text>
                        </Group>
                      )}
                      <Text size="xs" c="dark.3">
                        Last played: {formatDate(profile.timestamp)}
                      </Text>
                    </Stack>
                  </Group>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={(e) => handleDeleteProfile(profile.playerProfile.id, profile.playerProfile.handle, e)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>
              </Paper>
            );
          })}
            </>
          )}

          {/* Create new profile button */}
          <Button
            size="lg"
            variant="outline"
            leftSection={<IconPlus size={20} />}
            onClick={handleNewProfile}
            fullWidth
            c="terminal.5"
            style={{
              borderColor: 'var(--mantine-color-terminal-5)',
              marginTop: otherProfiles.length > 0 ? '1rem' : '0',
            }}
          >
            Create New Profile
          </Button>
        </Stack>

        <Text size="xs" c="dark.3" ta="center">
          Your profiles are stored locally in your browser
        </Text>
      </Stack>
    </Box>
  );
}
