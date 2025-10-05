import { Group, Text, Button, ActionIcon, Menu, rem } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { useState, useEffect } from 'react';
import { IconDotsVertical, IconDownload, IconUpload, IconPlayerPlay } from '@tabler/icons-react';
import SkipDaysModal from './SkipDaysModal';
import { exportToFile, importFromFile, startNewGame } from '../utils/storage';
import { FileButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';

export default function Header() {
  const { day, canAdvanceDay, getTimeUntilNextDay, advanceDay, marketOpen } = useStore();

  const [timeRemaining, setTimeRemaining] = useState('');
  const [canAdvance, setCanAdvance] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeUntilNextDay();
      const canNowAdvance = canAdvanceDay();
      setCanAdvance(canNowAdvance);

      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining('Ready!');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getTimeUntilNextDay, canAdvanceDay]);

  const handleAdvanceDay = () => {
    advanceDay();
  };

  const handleExport = () => {
    try {
      exportToFile();
      notifications.show({
        title: 'Export Successful',
        message: 'Your save file has been downloaded',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Failed to export save',
        color: 'red',
      });
    }
  };

  const handleImport = async (importedFile: File | null) => {
    if (!importedFile) return;

    try {
      await importFromFile(importedFile);
      notifications.show({
        title: 'Import Successful',
        message: 'Save loaded. Reloading game...',
        color: 'green',
      });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      notifications.show({
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Failed to import save',
        color: 'red',
      });
    }
  };

  const handleNewGame = () => {
    if (confirm('Start a new game? This will delete your current progress.')) {
      startNewGame();
    }
  };

  return (
    <>
      <Group h="100%" px="md" justify="space-between">
        {/* Left: Logo */}
        <Text size="xl" fw={900} c="terminal.5" ff="monospace">
          CRYPTO WARS
        </Text>

        {/* Right: Day counter and menu */}
        <Group gap="md">
          {/* Day Counter */}
          <Group gap="xs">
            <Text size="sm" c="dimmed" ff="monospace">
              Day {day}
            </Text>
            <Text size="xs" c={marketOpen ? 'green' : 'red'} fw={700} tt="uppercase">
              {marketOpen ? 'OPEN' : 'CLOSED'}
            </Text>
            <Text
              size="lg"
              fw={700}
              c={canAdvance ? 'terminal.5' : 'dimmed'}
              ff="monospace"
              style={{ minWidth: 60, textAlign: 'center' }}
            >
              {timeRemaining}
            </Text>
            <Button
              size="xs"
              color="terminal.5"
              onClick={handleAdvanceDay}
            >
              Next Day
            </Button>
            <Button size="xs" variant="light" onClick={() => setSkipModalOpen(true)}>
              Skip
            </Button>
          </Group>

          {/* Settings Menu */}
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={20} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Save Game</Menu.Label>
              <Menu.Item
                leftSection={<IconDownload style={{ width: rem(14), height: rem(14) }} />}
                onClick={handleExport}
              >
                Export .cwars
              </Menu.Item>
              <FileButton onChange={handleImport} accept=".cwars">
                {(props) => (
                  <Menu.Item
                    {...props}
                    leftSection={<IconUpload style={{ width: rem(14), height: rem(14) }} />}
                  >
                    Import .cwars
                  </Menu.Item>
                )}
              </FileButton>

              <Menu.Divider />

              <Menu.Label>Danger Zone</Menu.Label>
              <Menu.Item
                color="red"
                leftSection={<IconPlayerPlay style={{ width: rem(14), height: rem(14) }} />}
                onClick={handleNewGame}
              >
                New Game
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <SkipDaysModal opened={skipModalOpen} onClose={() => setSkipModalOpen(false)} />
    </>
  );
}
