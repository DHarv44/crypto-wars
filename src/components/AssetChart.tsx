import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { Paper, Stack, SegmentedControl, Text, Group, Loader, Box } from '@mantine/core';
import { getTimeSeries, decompressTimeSeries } from '../data/db';
import { ChartResolution, GeneratedEvent } from '../data/types';
import { useStore } from '../stores/rootStore';
import { getActiveProfileId } from '../utils/storage';

interface AssetChartProps {
  assetId: string;
  assetName: string;
}

export default function AssetChart({ assetId, assetName }: AssetChartProps) {
  const { tick } = useStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [resolution, setResolution] = useState<ChartResolution>('1M');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GeneratedEvent[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<GeneratedEvent | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00FF00',
      downColor: '#FF0000',
      borderUpColor: '#00FF00',
      borderDownColor: '#FF0000',
      wickUpColor: '#00FF00',
      wickDownColor: '#FF0000',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Load chart data when resolution changes
  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        const profileId = getActiveProfileId();
        if (!profileId) {
          console.error('No active profile');
          setLoading(false);
          return;
        }

        const compressed = await getTimeSeries(profileId, assetId, resolution);
        if (!compressed) {
          console.error('No chart data found');
          setLoading(false);
          return;
        }

        const decompressed = decompressTimeSeries(compressed);
        setEvents(compressed.events || []);

        // Convert OHLC data to lightweight-charts format
        const chartData: CandlestickData[] = decompressed.map((ohlc) => ({
          time: (tick + ohlc.day) as Time, // Convert relative day to absolute tick
          open: ohlc.open,
          high: ohlc.high,
          low: ohlc.low,
          close: ohlc.close,
        }));

        if (seriesRef.current) {
          seriesRef.current.setData(chartData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load chart data:', error);
        setLoading(false);
      }
    };

    loadChartData();
  }, [assetId, resolution, tick]);

  // Add event markers
  useEffect(() => {
    if (!seriesRef.current || events.length === 0) return;

    const markers = events.map((event) => ({
      time: (tick + event.day) as Time,
      position: event.impact > 0 ? ('belowBar' as const) : ('aboveBar' as const),
      color: event.impact > 0 ? '#00FF00' : '#FF0000',
      shape: event.type === 'news' ? ('circle' as const) : ('square' as const),
      text: event.type === 'news' ? 'N' : 'I',
    }));

    seriesRef.current.setMarkers(markers);
  }, [events, tick]);

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
          />
        </Group>

        {/* Chart Container */}
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

        {/* Event Legend */}
        <Group gap="md">
          <Text size="xs" c="dimmed">
            Legend:
          </Text>
          <Group gap="xs">
            <Box
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#00FF00',
              }}
            />
            <Text size="xs" c="dimmed">
              Positive News
            </Text>
          </Group>
          <Group gap="xs">
            <Box
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#FF0000',
              }}
            />
            <Text size="xs" c="dimmed">
              Negative News
            </Text>
          </Group>
          <Group gap="xs">
            <Box
              style={{
                width: 10,
                height: 10,
                backgroundColor: '#00FF00',
              }}
            />
            <Text size="xs" c="dimmed">
              Influencer Post
            </Text>
          </Group>
        </Group>

        {/* Hovered Event */}
        {hoveredEvent && (
          <Paper p="sm" bg="dark.8" withBorder>
            <Text size="xs" c="dimmed" mb={4}>
              Day {hoveredEvent.day}
            </Text>
            <Text size="sm" fw={500}>
              {hoveredEvent.headline}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Source: {hoveredEvent.source}
            </Text>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}
