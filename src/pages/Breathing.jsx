// src/pages/Breathing.jsx
import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Play, Pause, ChevronLeft } from "lucide-react";

export default function Breathing() {
  const [speed, setSpeed] = useState("normal");
  const [playing, setPlaying] = useState(false);
  const [breaths, setBreaths] = useState(0);
  const textRef = useRef(null);

  const speeds = {
    slow: { duration: 8, label: "Slow (8s)" },
    normal: { duration: 6, label: "Normal (6s)" },
    fast: { duration: 4, label: "Fast (4s)" }
  };

  useEffect(() => {
    if (!playing) return;
    const cycle = setInterval(() => {
      setBreaths(b => b + 1);
      // animate text
      if (textRef.current) {
        textRef.current.classList.add("scale-105");
        setTimeout(()=>textRef.current.classList.remove("scale-105"), 400);
      }
    }, speeds[speed].duration * 1000);
    return () => clearInterval(cycle);
  }, [playing, speed]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <Header />
        <div className="max-w-4xl mx-auto">
          <button className="text-gray-600 mb-4 flex items-center" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5 mr-2" /> Back
          </button>
          <div className="bg-white rounded-2xl p-8 shadow text-center">
            <h2 className="text-2xl font-semibold mb-2">Breathing Exercise</h2>
            <p className="text-gray-500 mb-6">Find your calm with a guided breathing pattern.</p>

            <div className="flex justify-center gap-3 mb-6">
              {Object.keys(speeds).map(k => (
                <button key={k} className={`px-4 py-2 rounded-full ${speed===k ? "bg-teal-500 text-white" : "bg-gray-100"}`} onClick={()=>setSpeed(k)}>
                  {speeds[k].label}
                </button>
              ))}
            </div>

            <div className="relative h-72 flex items-center justify-center mb-6">
              <div className={`rounded-full bg-teal-300 opacity-30 ${playing ? "animate-breathe" : ""}`} style={{ width: 300, height: 300, animationDuration: `${speeds[speed].duration}s` }} />
              <div className="absolute w-40 h-40 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                <span ref={textRef}>{playing ? "Breathe" : "Paused"}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={()=>setPlaying(p=>!p)} className="bg-white p-4 rounded-full shadow">
                { playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" /> }
              </button>
              <div className="text-sm text-gray-500">Breaths completed: <span className="font-semibold">{breaths}</span></div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes breathe {
          0% { transform: scale(0.8); opacity:0.35 }
          50% { transform: scale(1.15); opacity:0.08 }
          100% { transform: scale(0.8); opacity:0.35 }
        }
        .animate-breathe { animation: breathe linear infinite; }
      `}</style>
    </div>
  );
}
