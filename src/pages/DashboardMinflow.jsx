// src/pages/DashboardMindFlow.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from "recharts";
import { Zap, CloudSun, Battery, Moon } from "lucide-react";

const mockMoodWave = [
  { name: "Mon", value: 6.5 }, { name: "Tue", value: 7.0 }, { name: "Wed", value: 8.0 },
  { name: "Thu", value: 7.8 }, { name: "Fri", value: 8.5 }, { name: "Sat", value: 9.0 }, { name: "Sun", value: 8.8 }
];

function StatCard({ icon, title, value, note }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-purple-50">
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-400">{title}</div>
          <div className="text-xl font-semibold">{value}</div>
          {note && <div className="text-sm text-gray-400">{note}</div>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardMindFlow() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <Header />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-semibold mb-3">Your Mood Wave</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <Area data={mockMoodWave} dataKey="value" stroke="#fff" fill="rgba(255,255,255,0.12)" />
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow">
            <h4 className="font-semibold mb-2">Quick Calm</h4>
            <p className="text-sm text-gray-500 mb-4">Start a 3-min breathing session to reset.</p>
            <button className="bg-gradient-to-r from-teal-400 to-blue-500 text-white py-2 px-4 rounded-lg">Start 3-min session</button>
          </div>

          <StatCard icon={<CloudSun className="w-5 h-5 text-indigo-500" />} title="Overall Mood" value="7.8" note="+12% from last week" />
          <StatCard icon={<Battery className="w-5 h-5 text-green-500" />} title="Energy" value="85%" note="Above average" />
          <StatCard icon={<Moon className="w-5 h-5 text-purple-500" />} title="Sleep" value="6.5h" note="Good rest" />

          <div className="lg:col-span-2 bg-white rounded-2xl p-6 mt-6 shadow">
            <h4 className="font-semibold mb-3">Recent Activities</h4>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div><strong>Mood Check-in</strong><div className="text-sm text-gray-500">Feeling optimistic today</div></div>
                  <div className="text-sm text-gray-400">2 hours ago</div>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div><strong>Breathing Session</strong><div className="text-sm text-gray-500">2 min guided</div></div>
                  <div className="text-sm text-gray-400">Yesterday</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
