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

  const [resolution, setResolution] = useState<ChartResolution>('1D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartLabels, setChartLabels] = useState<string[]>([]);

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
          timeVisible: false,
          tickMarkFormatter: (time: any) => {
            // Use our stored labels array
            const index = Math.floor(time);
            return chartLabels[index] || `${index}`;
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(0, 255, 0, 0.3)',
          visible: true,
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          mode: 0, // Normal price scale mode
          minMove: 0.000001, // Support prices down to 6 decimal places
          minimumWidth: 80, // Ensure enough space for labels
        },
        localization: {
          priceFormatter: (price: number) => {
            // For very small prices, use appropriate decimal places
            if (price === 0) return '0.000000';
            if (price < 0.0001) {
              return price.toFixed(8);
            } else if (price < 0.01) {
              return price.toFixed(6);
            } else if (price < 1) {
              return price.toFixed(4);
            } else {
              return price.toFixed(2);
            }
          },
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
        if (!asset || !asset.priceHistory) {
          console.error(`[AssetChart] No price history found for assetId=${assetId}`);
          setError('No price data available');
          setLoading(false);
          return;
        }

        console.log(`[AssetChart] Loading chart data: assetId=${assetId}, resolution=${resolution}`);

        // Select correct resolution array from priceHistory
        let candles: any[] = [];
        switch (resolution) {
          case '1D':
            candles = asset.priceHistory?.today || [];
            break;
          case '5D':
            candles = asset.priceHistory?.d5 || [];
            break;
          case '1M':
            candles = asset.priceHistory?.m1 || [];
            break;
          case '1Y':
            candles = asset.priceHistory?.y1 || [];
            break;
          case '5Y':
            candles = asset.priceHistory?.y5 || [];
            break;
          default:
            candles = asset.priceHistory?.today || [];
        }

        console.log(`[AssetChart] Found ${candles.length} candles for ${resolution}`);

        // Convert to lightweight-charts format with proper time labels
        const ticksPerDay = 1800;
        const labels: string[] = [];
        const chartData = candles.map((candle, index) => {
          let timeLabel: string;

          switch (resolution) {
            case '1D':
              // Show minutes (0-30)
              const minute = Math.floor((candle.tick % ticksPerDay) / (ticksPerDay / 30));
              timeLabel = `${minute}`;
              break;
            case '5D':
              // Show day number
              const day5d = Math.abs(candle.day);
              timeLabel = `D${day5d}`;
              break;
            case '1M':
              // Show day number
              const day1m = Math.abs(candle.day);
              timeLabel = `D${day1m}`;
              break;
            case '1Y':
              // Show day number
              const day1y = Math.abs(candle.day);
              timeLabel = `D${day1y}`;
              break;
            case '5Y':
              // Show week number
              const week = Math.abs(Math.floor(candle.day / 7));
              timeLabel = `W${week}`;
              break;
            default:
              timeLabel = `${index}`;
          }

          labels.push(timeLabel);

          return {
            time: index, // Use index for consistent spacing
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          };
        });

        // Update labels state and refresh chart formatter
        setChartLabels(labels);
        if (chartRef.current) {
          chartRef.current.applyOptions({
            timeScale: {
              tickMarkFormatter: (time: any) => {
                const index = Math.floor(time);
                return labels[index] || `${index}`;
              },
            },
          });
        }

        if (seriesRef.current && chartData.length > 0) {
          seriesRef.current.setData(chartData);
        } else if (seriesRef.current && chartData.length === 0) {
          // Clear chart if no data
          seriesRef.current.setData([]);
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
