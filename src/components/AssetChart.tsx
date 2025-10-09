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
  const yesterdaySeriesRef = useRef<any>(null);

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

      // Add muted series for yesterday data (30% opacity)
      const yesterdaySeries = chart.addSeries(CandlestickSeries, {
        upColor: 'rgba(0, 255, 0, 0.3)',
        downColor: 'rgba(255, 0, 0, 0.3)',
        borderUpColor: 'rgba(0, 255, 0, 0.3)',
        borderDownColor: 'rgba(255, 0, 0, 0.3)',
        wickUpColor: 'rgba(0, 255, 0, 0.3)',
        wickDownColor: 'rgba(255, 0, 0, 0.3)',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
      yesterdaySeriesRef.current = yesterdaySeries;
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

        // For 1D, 5D, 1M: Load combined dataset (d5 + m1) for context
        // For 1Y, 5Y: Load specific datasets (too much data to combine)
        let candles: any[] = [];
        let visibleRange: { from: number; to: number } | null = null;

        const ticksPerDay = 1800;

        if (resolution === '1D') {
          // Load yesterday + today for 1D view (shows context from previous day)
          const yesterday = asset.priceHistory?.yesterday || [];
          const today = asset.priceHistory?.today || [];
          candles = [...yesterday, ...today];
          visibleRange = { from: 0, to: candles.length - 1 }; // Show all
        } else if (resolution === '5D') {
          // Load d5 (last 5 days, 6 candles/day = 30 candles)
          candles = asset.priceHistory?.d5 || [];
          visibleRange = { from: 0, to: candles.length - 1 };
        } else if (resolution === '1M') {
          // Load m1 (30 daily candles)
          candles = asset.priceHistory?.m1 || [];
          visibleRange = { from: 0, to: candles.length - 1 };
        } else if (resolution === '1Y') {
          candles = asset.priceHistory?.y1 || [];
          visibleRange = { from: 0, to: candles.length - 1 };
        } else if (resolution === '5Y') {
          candles = asset.priceHistory?.y5 || [];
          visibleRange = { from: 0, to: candles.length - 1 };
        }

        console.log(`[AssetChart] Found ${candles.length} candles, resolution=${resolution}`);

        // Convert to lightweight-charts format with proper time labels
        const labels: string[] = [];
        const chartData = candles.map((candle, index) => {
          let timeLabel: string;

          // Determine label format based on candle data (not resolution button)
          if (candle.day === -1) {
            // Yesterday candle (for 1D view context) - show time progression 0-30
            const yesterdayCandles = candles.filter((c: any) => c.day === -1);
            const yesterdayIndex = yesterdayCandles.findIndex((c: any) => c.tick === candle.tick);
            const minute = Math.floor((yesterdayIndex / yesterdayCandles.length) * 30);
            timeLabel = `YD:${minute}`;
          } else if (candle.tick !== undefined && candle.tick < ticksPerDay) {
            // Today's intraday candle - show minute
            const minute = Math.floor((candle.tick % ticksPerDay) / (ticksPerDay / 30));
            timeLabel = `${minute}`;
          } else if (candle.day !== undefined && candle.day >= -5 && candle.day <= 0) {
            // d5 candle - show day:period
            const day5d = candle.day;
            const tickInDay = candle.tick % ticksPerDay;
            const periodInDay = Math.floor((tickInDay / ticksPerDay) * 6);
            timeLabel = day5d === 0 ? `D0:P${periodInDay}` : `D${day5d}:P${periodInDay}`;
          } else if (candle.day !== undefined && candle.day >= -365) {
            // m1 or y1 candle - show day
            timeLabel = `D${Math.abs(candle.day)}`;
          } else {
            // y5 candle - show week
            const week = Math.abs(Math.floor((candle.day || 0) / 7));
            timeLabel = `W${week}`;
          }

          labels.push(timeLabel);

          return {
            time: index,
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

        if (chartData.length > 0) {
          // For 1D view, split data into yesterday (muted) and today (bright)
          if (resolution === '1D' && candles.some((c: any) => c?.day === -1)) {
            // Only split if we have yesterday data
            const yesterdayData = chartData.filter((_, index) => candles[index]?.day === -1);
            const todayData = chartData.filter((_, index) => candles[index]?.day !== -1);

            if (yesterdaySeriesRef.current) {
              yesterdaySeriesRef.current.setData(yesterdayData);
            }
            if (seriesRef.current) {
              seriesRef.current.setData(todayData);
            }
          } else {
            // Other resolutions or 1D without yesterday data - use main series only
            if (seriesRef.current) {
              seriesRef.current.setData(chartData);
            }
            if (yesterdaySeriesRef.current) {
              yesterdaySeriesRef.current.setData([]); // Clear yesterday series
            }
          }

          // Apply visible range zoom if specified
          if (visibleRange && chartRef.current) {
            chartRef.current.timeScale().setVisibleRange(visibleRange);
          }
        } else {
          // Clear both series if no data
          if (seriesRef.current) seriesRef.current.setData([]);
          if (yesterdaySeriesRef.current) yesterdaySeriesRef.current.setData([]);
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
