"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesData {
  date: string;
  revenue: number;
}

export default function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value / 1000}k`} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937', // bg-gray-800
            border: 'none',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: '#f9fafb' }} // text-gray-50
          itemStyle={{ color: '#60a5fa' }} // text-blue-400
          formatter={(value: number) => [`LKR ${value.toFixed(2)}`, 'Revenue']}
        />
        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}