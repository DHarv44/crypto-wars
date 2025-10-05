import { Paper, Stack, Text, Badge, Progress, Group } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import type { FeatureUnlock } from '../stores/unlocksSlice';

interface UnlockCardProps {
  unlock: FeatureUnlock;
  progress: string;
}

export default function UnlockCard({ unlock, progress }: UnlockCardProps) {
  return (
    <Paper p="md" withBorder style={{ opacity: 0.6, borderStyle: 'dashed' }}>
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconLock size={20} />
            <Text size="lg" fw={700} c="dimmed">
              {unlock.name}
            </Text>
          </Group>
          <Badge color="gray" variant="light">
            Locked
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          {unlock.description}
        </Text>

        <Text size="sm" fw={600} c="dimmed">
          ✨ {unlock.perk}
        </Text>

        <Stack gap="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            Requirements
          </Text>
          <Text size="sm" c="dimmed" ff="monospace">
            {progress}
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );
}
