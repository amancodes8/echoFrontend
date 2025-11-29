// src/pages/NeuroMood.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Gauge, Sparkles } from "lucide-react";

export default function NeuroMood() {
  return (
    <div className="flex min-h-screen bg-[#0b1020] text-white">
      <Sidebar />
      <main className="flex-1 p-8">
        <Header theme="dark" />
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-b from-[#0f1724] to-[#0b1020] rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-[#071027] rounded-lg">
                <h4 className="text-sm text-gray-300">Mood Analytics</h4>
                <div className="mt-4 space-y-3">
                  <div className="text-sm">Happiness <span className="float-right text-green-400">87%</span></div>
                  <div className="text-sm">Stress <span className="float-right text-orange-400">23%</span></div>
                  <div className="text-sm">Focus <span className="float-right text-blue-400">92%</span></div>
                </div>
              </div>

              <div className="p-6 flex items-center justify-center">
                <div className="w-80 h-80 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600 opacity-20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-semibold">Mood: Optimistic</div>
                    <div className="text-sm text-gray-200 mt-2">Confidence 87%</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#071027] rounded-lg">
                <h4 className="text-sm text-gray-300">AI Prediction</h4>
                <div className="mt-4 text-sm text-gray-200">
                  <div>Primary Emotion: Joy</div>
                  <div>Secondary: Excitement</div>
                  <div>Intensity: High</div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#071027] rounded-lg">
              <h4 className="text-sm text-gray-300 mb-2">Live Data Stream</h4>
              <pre className="text-xs text-green-300 p-3 bg-black/20 rounded">neural pattern: STABLE
emotion vector: [0.87, 0.23, 0.92]
prediction accuracy: 94.2%</pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
