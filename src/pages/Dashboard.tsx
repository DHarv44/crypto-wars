import { Container, Stack, Grid } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { useEffect } from 'react';
import KPIBar from '../components/KPIBar';
import TickerTape from '../components/TickerTape';
import EventFeed from '../components/EventFeed';
import PortfolioTable from '../components/PortfolioTable';
import BuySellModal from '../features/trading/BuySellModal';

export default function Dashboard() {
  const { initGame } = useStore();

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <KPIBar />

        <TickerTape />

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <EventFeed />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PortfolioTable />
          </Grid.Col>
        </Grid>
      </Stack>

      <BuySellModal />
    </Container>
  );
}
