import { Paper, Text, Stack } from '@mantine/core';
import { useStore } from '../stores/rootStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatUSD } from '../utils/format';

export default function PortfolioValueChart() {
  const { netWorthHistory } = useStore();

  // Transform data for chart
  const chartData = netWorthHistory.map((point) => ({
    tick: point.tick,
    value: point.value,
  }));

  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const initialValue = chartData.length > 0 ? chartData[0].value : 0;
  const change = latestValue - initialValue;
  const changeColor = change >= 0 ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-red-6)';

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <div>
          <Text size="sm" fw={600} c="dimmed" tt="uppercase">
            Portfolio Value
          </Text>
          <Text size="xs" c="dimmed">
            Net worth over time
          </Text>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-dark-4)" opacity={0.3} />
            <XAxis
              dataKey="tick"
              stroke="var(--mantine-color-dark-3)"
              style={{ fontSize: 11 }}
              label={{ value: 'Tick', position: 'insideBottom', offset: -5, style: { fill: 'var(--mantine-color-dimmed)' } }}
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
              labelFormatter={(tick) => `Tick ${tick}`}
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
