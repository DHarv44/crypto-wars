import { Modal, Stack, Text, NumberInput, Button, Group, Alert } from '@mantine/core';
import { useState } from 'react';
import { useStore } from '../stores/rootStore';

interface SkipDaysModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function SkipDaysModal({ opened, onClose }: SkipDaysModalProps) {
  const { skipDays, saveToSession } = useStore();
  const [numDays, setNumDays] = useState<number | string>(1);

  const handleSkip = () => {
    if (typeof numDays === 'number' && numDays > 0) {
      skipDays(numDays);
      saveToSession();
      setNumDays(1);
      onClose();
    }
  };

  const handleClose = () => {
    setNumDays(1);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text size="lg" fw={700} c="terminal.5" tt="uppercase">
          Skip Days
        </Text>
      }
      size="md"
    >
      <Stack gap="md">
        <Alert color="yellow" variant="light">
          <Text size="sm">
            ⚠️ Skipping days will advance time and process all market events, operations, and offers. This action
            cannot be undone.
          </Text>
        </Alert>

        <NumberInput
          label="Number of Days to Skip"
          placeholder="Enter number of days"
          value={numDays}
          onChange={setNumDays}
          min={1}
          max={30}
          step={1}
          size="lg"
        />

        <Text size="sm" c="dimmed">
          The market will simulate {typeof numDays === 'number' ? numDays : 0} day(s) of activity. Prices will
          fluctuate, operations will complete, and offers may expire.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={handleClose}>
            Cancel
          </Button>
          <Button color="terminal.5" onClick={handleSkip} disabled={!numDays || numDays === 0}>
            Skip {typeof numDays === 'number' ? numDays : 0} Day{numDays !== 1 ? 's' : ''}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
