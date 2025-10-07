import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { Paper, Stack, SegmentedControl, Text, Group, Loader, Box, Alert } from '@mantine/core';
import { ChartResolution } from '../data/types';
import { useStore } from '../stores/rootStore';
import { AlertCircle } from 'lucide-react';

interface AssetChartProps {
  assetId: string;
  assetName: string;
}

export default function AssetChart({ assetId, assetName }: AssetChartProps) {
  const { assets, day } = useStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [resolution, setResolution] = useState<ChartResolution>('5D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#0B0E12' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: 'rgba(0, 255, 0, 0.1)' },
          horzLines: { color: 'rgba(0, 255, 0, 0.1)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        timeScale: {
          borderColor: 'rgba(0, 255, 0, 0.3)',
          timeVisible: true,
        },
        rightPriceScale: {
          borderColor: 'rgba(0, 255, 0, 0.3)',
        },
      });

      // V5 API: Use addSeries with CandlestickSeries type
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00FF00',
        downColor: '#FF0000',
        borderUpColor: '#00FF00',
        borderDownColor: '#FF0000',
        wickUpColor: '#00FF00',
        wickDownColor: '#FF0000',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
      setError(null);

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    } catch (err) {
      console.error('Failed to initialize chart:', err);
      setError(`Failed to initialize chart: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Load chart data when resolution changes
  useEffect(() => {
    const loadChartData = () => {
      if (error) return; // Don't try to load data if chart failed to initialize

      setLoading(true);
      try {
        const asset = assets[assetId];
        if (!asset || !asset.priceHistory || asset.priceHistory.length === 0) {
          console.error(`[AssetChart] No price history found for assetId=${assetId}`);
          setError('No price data available');
          setLoading(false);
          return;
        }

        console.log(`[AssetChart] Loading chart data: assetId=${assetId}, resolution=${resolution}, priceHistory length=${asset.priceHistory.length}`);

        // Filter candles by resolution (day range)
        let daysToShow = 365;
        switch (resolution) {
          case '5D': daysToShow = 5; break;
          case '1M': daysToShow = 30; break;
          case '1Y': daysToShow = 365; break;
          case '5Y': daysToShow = 365 * 5; break;
        }

        const fromDay = day - daysToShow;
        const filteredCandles = asset.priceHistory.filter(candle => candle.day >= fromDay && candle.day <= day);

        console.log(`[AssetChart] Filtered ${filteredCandles.length} candles for ${resolution} (from day ${fromDay} to ${day})`);

        // Convert to lightweight-charts format
        const chartData = filteredCandles.map((candle) => ({
          time: candle.tick,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        if (seriesRef.current && chartData.length > 0) {
          seriesRef.current.setData(chartData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load chart data:', err);
        setError(`Failed to load chart data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadChartData();
  }, [assetId, resolution, day, error, assets]);

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Text size="lg" fw={700} c="terminal.5">
            {assetName} Chart
          </Text>

          {/* Resolution Toggle */}
          <SegmentedControl
            value={resolution}
            onChange={(value) => setResolution(value as ChartResolution)}
            data={[
              { label: '1D', value: '1D' },
              { label: '5D', value: '5D' },
              { label: '1M', value: '1M' },
              { label: '1Y', value: '1Y' },
              { label: '5Y', value: '5Y' },
            ]}
            size="xs"
            disabled={!!error}
          />
        </Group>

        {/* Error Display */}
        {error && (
          <Alert icon={<AlertCircle size={16} />} title="Chart Error" color="red">
            {error}
          </Alert>
        )}

        {/* Chart Container */}
        {!error && (
          <Box pos="relative">
            {loading && (
              <Box
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}
              >
                <Loader color="terminal.5" />
              </Box>
            )}
            <div ref={chartContainerRef} style={{ opacity: loading ? 0.3 : 1 }} />
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
