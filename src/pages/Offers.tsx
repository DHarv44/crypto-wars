import { Container, Title, Text, Stack } from '@mantine/core';
import OffersPanel from '../features/offers/OffersPanel';

export default function Offers() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} c="terminal.5">
            OFFERS
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Exclusive deals from governments and whales
          </Text>
        </div>

        <OffersPanel />
      </Stack>
    </Container>
  );
}
