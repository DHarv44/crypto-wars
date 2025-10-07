import { Container, Stack, Grid } from '@mantine/core';
import KPIBar from '../components/KPIBar';
import TickerTape from '../components/TickerTape';
import NewsTicker from '../components/NewsTicker';
import EventFeed from '../components/EventFeed';
import PortfolioTable from '../components/PortfolioTable';
import PnLMetrics from '../components/PnLMetrics';
import PortfolioValueChart from '../components/PortfolioValueChart';
import RecentTrades from '../components/RecentTrades';
import LimitOrdersTable from '../components/LimitOrdersTable';
import BuySellModal from '../features/trading/BuySellModal';

export default function Dashboard() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <KPIBar />

        <PnLMetrics />

        <TickerTape />

        <NewsTicker />

        <PortfolioTable />

        <LimitOrdersTable />

        <PortfolioValueChart />

        <RecentTrades />

        <EventFeed />
      </Stack>

      <BuySellModal />
    </Container>
  );
}
