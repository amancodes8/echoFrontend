import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function MoodLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="name" />
        <YAxis domain={[6, 9]} tickCount={5} />
        <Tooltip />
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="#6366F1"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
