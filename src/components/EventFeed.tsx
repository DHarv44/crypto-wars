import { Paper, Stack, Text, Badge, Group, ScrollArea } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { formatTick } from '../utils/format';

export default function EventFeed() {
  const { getRecent } = useStore();
  const recentEvents = getRecent(10);

  const getSeverityColor = (event: (typeof recentEvents)[0]) => {
    const severity = event.severity || event.type;
    if (severity === 'info' || severity === 'offer' || severity === 'trade') return 'blue';
    if (severity === 'warning' || severity === 'viral_post') return 'yellow';
    if (severity === 'danger' || severity === 'rug' || severity === 'exit_scam' || severity === 'freeze') return 'red';
    if (severity === 'success' || severity === 'whale_buyback' || severity === 'gov_bump') return 'green';
    return 'gray';
  };

  return (
    <Paper p="md" withBorder>
      <Text size="sm" fw={700} mb="sm" c="terminal.5" tt="uppercase">
        Event Feed
      </Text>
      <ScrollArea h={300}>
        <Stack gap="xs">
          {recentEvents.length === 0 && (
            <Text size="sm" c="dimmed" fs="italic">
              No events yet...
            </Text>
          )}
          {recentEvents.map((event) => (
            <Group key={event.id} gap="xs" wrap="nowrap" align="flex-start">
              <Badge size="sm" color={getSeverityColor(event)} variant="light" style={{ flexShrink: 0 }}>
                {formatTick(event.tick)}
              </Badge>
              <Text size="sm" c="terminal.5" ff="monospace" style={{ flex: 1 }}>
                {event.message}
              </Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
