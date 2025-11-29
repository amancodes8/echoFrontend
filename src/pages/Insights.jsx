// src/pages/Insights.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Area } from "recharts";

const before = [{week: "W1", v: 3}, {week:"W2", v:3.2}, {week:"W3", v:3.4}, {week:"W4", v:3.5}];
const after = [{week: "W1", v:4.1}, {week:"W2", v:4.5}, {week:"W3", v:4.7}, {week:"W4", v:4.9}];

export default function Insights() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <Header />
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">Emotional Insights</h2>

          <div className="bg-white rounded-2xl p-6 shadow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Before (first 30 days)</h4>
                <div style={{height:250}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Area data={before} dataKey="v" stroke="#ef4444" fill="rgba(239,68,68,0.08)" />
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">After (last 30 days)</h4>
                <div style={{height:250}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Area data={after} dataKey="v" stroke="#10b981" fill="rgba(16,185,129,0.08)" />
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold">4.6</div>
                <div className="text-sm text-gray-500">Avg Mood (after)</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold">78%</div>
                <div className="text-sm text-gray-500">Stability</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold">29</div>
                <div className="text-sm text-gray-500">Entries</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-semibold mb-3">Progress Summary</h3>
            <p className="text-gray-600">Your average mood has improved by 43.8% over the last 90 days. Consider continuing the breathing and micro-breaks routine.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
