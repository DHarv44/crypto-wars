import { Container, Stack, Grid } from '@mantine/core';
import KPIBar from '../components/KPIBar';
import TickerTape from '../components/TickerTape';
import NewsTicker from '../components/NewsTicker';
import EventFeed from '../components/EventFeed';
import PortfolioTable from '../components/PortfolioTable';
import PnLMetrics from '../components/PnLMetrics';
import PortfolioValueChart from '../components/PortfolioValueChart';
import RecentTrades from '../components/RecentTrades';
import BuySellModal from '../features/trading/BuySellModal';

export default function Dashboard() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <KPIBar />

        <PnLMetrics />

        <TickerTape />

        <NewsTicker />

        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <PortfolioValueChart />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <PortfolioTable />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <RecentTrades />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <EventFeed />
          </Grid.Col>
        </Grid>
      </Stack>

      <BuySellModal />
    </Container>
  );
}
