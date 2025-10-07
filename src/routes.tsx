import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import AssetDetail from './pages/AssetDetail';
import Ops from './pages/Ops';
import Offers from './pages/Offers';
import Influencer from './pages/Influencer';
import Reports from './pages/Reports';
import Social from './pages/Social';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/market" element={<Market />} />
      <Route path="/symbol/:symbol" element={<AssetDetail />} />
      <Route path="/social" element={<Social />} />
      <Route path="/ops" element={<Ops />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/influencer" element={<Influencer />} />
      <Route path="/reports" element={<Reports />} />
    </Routes>
  );
}
