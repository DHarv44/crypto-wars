import { Container, Title, Text, Stack } from '@mantine/core';
import InfluencerPanel from '../features/influencer/InfluencerPanel';

export default function Influencer() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} c="terminal.5">
            INFLUENCER HQ
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Build your crypto influencer brand and market influence
          </Text>
        </div>

        <InfluencerPanel />
      </Stack>
    </Container>
  );
}
