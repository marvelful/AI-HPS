'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const QueryBarChart = dynamic(() => import('./QueryBarChart'), { ssr: false });

export default function AnalyticsQueryChart() {
  return (
    <div className="bg-card rounded-md shadow-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>Daily Query Volume</h2>
      </div>
      <QueryBarChart />
    </div>
  );
}