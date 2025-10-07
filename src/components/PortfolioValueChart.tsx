import { Paper, Text, Stack, Group, SegmentedControl } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatUSD } from '../utils/format';
import { useState } from 'react';

type PortfolioResolution = '1D' | '5D' | '1M' | '1Y' | '5Y';

export default function PortfolioValueChart() {
  const { netWorthHistory, day, getTimeUntilNextDay, realTimeDayDuration } = useStore();
  const [resolution, setResolution] = useState<PortfolioResolution>('1D');

  // Aggregate data into fixed data points based on resolution
  const getChartData = () => {
    if (!netWorthHistory || netWorthHistory.length === 0) return [];

    const currentDay = day || 1;
    const ticksPerDay = 1800; // 1800 ticks = 30 minutes
    const ticksPerMinute = ticksPerDay / 30; // 60 ticks per minute

    // Calculate current elapsed time in the day (in minutes) using same calculation as timer
    const remaining = getTimeUntilNextDay();
    const elapsed = realTimeDayDuration - remaining;
    const elapsedMinutes = Math.floor((elapsed / realTimeDayDuration) * 30);
    const currentTick = (currentDay - 1) * ticksPerDay + (elapsed / realTimeDayDuration) * ticksPerDay;

    let dataPoints: Array<{ label: string; value: number | null }> = [];
    let startTick: number;
    let endTick: number;

    switch (resolution) {
      case '1D':
        // 30 data points (1 per minute) for today
        startTick = (currentDay - 1) * ticksPerDay;
        endTick = currentDay * ticksPerDay;
        for (let i = 0; i < 30; i++) {
          const minuteStartTick = startTick + (i * ticksPerMinute);
          const minuteEndTick = startTick + ((i + 1) * ticksPerMinute);

          // Only show data up to current minute
          if (minuteStartTick > currentTick) {
            break; // Stop adding future data points
          }

          const pointsInRange = netWorthHistory.filter(p => p.tick >= minuteStartTick && p.tick < minuteEndTick);

          // For current minute, use the latest available data or interpolate
          let value = null;
          if (pointsInRange.length > 0) {
            value = pointsInRange[pointsInRange.length - 1].value;
          } else if (i === 0 && netWorthHistory.length > 0) {
            // For minute 0, use initial net worth if no data yet
            const previousDayData = netWorthHistory.filter(p => p.tick < startTick);
            if (previousDayData.length > 0) {
              value = previousDayData[previousDayData.length - 1].value;
            }
          }

          dataPoints.push({
            label: `${i}m`,
            value,
          });
        }
        break;

      case '5D':
        // 20 data points (4 per day) for last 5 days
        startTick = Math.max(0, (currentDay - 5) * ticksPerDay);
        endTick = currentDay * ticksPerDay;
        const ticksPer5DPoint = (5 * ticksPerDay) / 20;
        for (let i = 0; i < 20; i++) {
          const pointStartTick = startTick + (i * ticksPer5DPoint);
          const pointEndTick = startTick + ((i + 1) * ticksPer5DPoint);
          const pointsInRange = netWorthHistory.filter(p => p.tick >= pointStartTick && p.tick < pointEndTick);
          const pointDay = Math.floor(pointStartTick / ticksPerDay) + 1;
          dataPoints.push({
            label: `D${pointDay}`,
            value: pointsInRange.length > 0 ? pointsInRange[pointsInRange.length - 1].value : null,
          });
        }
        break;

      case '1M':
        // 30 data points (1 per day) for last 30 days
        startTick = Math.max(0, (currentDay - 30) * ticksPerDay);
        for (let i = 0; i < 30; i++) {
          const dayStartTick = startTick + (i * ticksPerDay);
          const dayEndTick = startTick + ((i + 1) * ticksPerDay);
          const pointsInRange = netWorthHistory.filter(p => p.tick >= dayStartTick && p.tick < dayEndTick);
          const pointDay = Math.floor(dayStartTick / ticksPerDay) + 1;
          dataPoints.push({
            label: `D${pointDay}`,
            value: pointsInRange.length > 0 ? pointsInRange[pointsInRange.length - 1].value : null,
          });
        }
        break;

      case '1Y':
        // 365 data points (1 per day) for last year
        startTick = Math.max(0, (currentDay - 365) * ticksPerDay);
        for (let i = 0; i < 365; i++) {
          const dayStartTick = startTick + (i * ticksPerDay);
          const dayEndTick = startTick + ((i + 1) * ticksPerDay);
          const pointsInRange = netWorthHistory.filter(p => p.tick >= dayStartTick && p.tick < dayEndTick);
          const pointDay = Math.floor(dayStartTick / ticksPerDay) + 1;
          dataPoints.push({
            label: `D${pointDay}`,
            value: pointsInRange.length > 0 ? pointsInRange[pointsInRange.length - 1].value : null,
          });
        }
        break;

      case '5Y':
        // 1825 data points (1 per day) for last 5 years
        startTick = Math.max(0, (currentDay - 1825) * ticksPerDay);
        for (let i = 0; i < 1825; i++) {
          const dayStartTick = startTick + (i * ticksPerDay);
          const dayEndTick = startTick + ((i + 1) * ticksPerDay);
          const pointsInRange = netWorthHistory.filter(p => p.tick >= dayStartTick && p.tick < dayEndTick);
          const pointDay = Math.floor(dayStartTick / ticksPerDay) + 1;
          dataPoints.push({
            label: `D${pointDay}`,
            value: pointsInRange.length > 0 ? pointsInRange[pointsInRange.length - 1].value : null,
          });
        }
        break;
    }

    // Remove trailing null values (future data points)
    while (dataPoints.length > 0 && dataPoints[dataPoints.length - 1].value === null) {
      dataPoints.pop();
    }

    return dataPoints;
  };

  const chartData = getChartData();

  const latestValue = chartData.length > 0 ? (chartData[chartData.length - 1].value ?? 0) : 0;
  const initialValue = chartData.length > 0 ? (chartData[0].value ?? 0) : 0;
  const change = latestValue - initialValue;
  const changeColor = change >= 0 ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-red-6)';

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="sm" fw={600} c="dimmed" tt="uppercase">
              Portfolio Value
            </Text>
            <Text size="xs" c="dimmed">
              Net worth over time
            </Text>
          </div>

          <SegmentedControl
            size="xs"
            value={resolution}
            onChange={(value) => setResolution(value as PortfolioResolution)}
            data={[
              { label: '1D', value: '1D' },
              { label: '5D', value: '5D' },
              { label: '1M', value: '1M' },
              { label: '1Y', value: '1Y' },
              { label: '5Y', value: '5Y' },
            ]}
          />
        </Group>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-dark-4)" opacity={0.3} />
            <XAxis
              dataKey="label"
              stroke="var(--mantine-color-dark-3)"
              style={{ fontSize: 11 }}
            />
            <YAxis
              stroke="var(--mantine-color-dark-3)"
              style={{ fontSize: 11 }}
              tickFormatter={(value) => formatUSD(value, 0)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--mantine-color-dark-7)',
                border: '1px solid var(--mantine-color-dark-4)',
                borderRadius: 4,
              }}
              labelStyle={{ color: 'var(--mantine-color-dimmed)' }}
              formatter={(value: number) => [formatUSD(value, 2), 'Net Worth']}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={changeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
