import { Container, Title, Text, Stack } from '@mantine/core';
import OpsPanel from '../features/ops/OpsPanel';

export default function Ops() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} c="terminal.5">
            OPERATIONS
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Execute market manipulation operations to boost your assets and influence
          </Text>
        </div>

        <OpsPanel />
      </Stack>
    </Container>
  );
}
