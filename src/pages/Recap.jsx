// src/pages/Recap.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Check } from "lucide-react";

export default function Recap() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <Header />
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow text-center">
            <h2 className="text-3xl font-bold mb-2">Your Daily Recap</h2>
            <p className="text-gray-500 mb-6">A beautiful summary of your mindful moments today</p>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="h-48">
                <div className="flex items-center justify-center h-full text-gray-400">Mood journey chart placeholder</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-400">Meditation</div>
                <div className="text-xl font-semibold">25 minutes</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-400">Breathing sessions</div>
                <div className="text-xl font-semibold">12</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-400">Focus score</div>
                <div className="text-xl font-semibold">8.5 / 10</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-2xl">
              <h3 className="text-xl font-semibold">Beautiful work today!</h3>
              <p className="text-sm opacity-90 mt-1">You've shown dedication to your mindful journey. Keep it up.</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <Check className="w-4 h-4" /> Share Your Progress
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
