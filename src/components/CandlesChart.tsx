import { Paper, Text } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Asset } from '../engine/types';
import { formatUSD } from '../utils/format';

interface CandlesChartProps {
  asset: Asset;
}

export default function CandlesChart({ asset }: CandlesChartProps) {
  const history = asset.priceHistory || [];

  // Transform data for Recharts
  const chartData = history.map((candle) => ({
    tick: candle.tick,
    price: candle.close,
    high: candle.high,
    low: candle.low,
  }));

  if (chartData.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          No price history available yet. Start the simulation to see charts.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Text size="sm" fw={700} mb="md" c="terminal.5" tt="uppercase">
        Price Chart
      </Text>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="tick"
            stroke="#00ff00"
            tick={{ fill: '#00ff00', fontSize: 12 }}
            label={{ value: 'Day', position: 'insideBottom', offset: -5, fill: '#888' }}
          />
          <YAxis
            stroke="#00ff00"
            tick={{ fill: '#00ff00', fontSize: 12 }}
            tickFormatter={(value) => formatUSD(value, value < 1 ? 6 : 2)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #00ff00',
              borderRadius: 4,
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#00ff00' }}
            formatter={(value: number) => [formatUSD(value, value < 1 ? 6 : 2), 'Price']}
            labelFormatter={(tick) => `Day ${tick}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#00ff00"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
