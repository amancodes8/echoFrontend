// src/components/ResultCard.jsx
import React from "react";
import { Check, AlertTriangle } from "lucide-react";

/**
 * result: { emotion_dist: [...], valence, arousal, recommendation, primary }
 */
export default function ResultCard({ result }) {
  const { emotion_dist, valence, arousal, recommendation, primary } = result;
  const score = Math.max(...emotion_dist || [0]);
  const confidence = Math.round(score * 100);

  // Human-friendly recommendation rendering
  const recTitle = recommendation?.title || "Try a grounding exercise";
  const recDesc = recommendation?.desc || (recommendation?.description || "Short breathing exercise to reduce arousal.");

  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inferred mood: <span className="text-purple-600">{primary}</span></h3>
          <p className="text-sm text-gray-500">Confidence {confidence}% — Valence: {valence.toFixed(2)} · Arousal: {arousal.toFixed(2)}</p>
        </div>
        <div>
          {confidence > 60 ? <Check className="text-green-500" /> : <AlertTriangle className="text-yellow-500" />}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-purple-50">
          <div className="text-sm text-gray-500">Primary emotion</div>
          <div className="text-xl font-semibold">{primary}</div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50">
          <div className="text-sm text-gray-500">Valence</div>
          <div className="text-xl font-semibold">{(valence*100).toFixed(0)}%</div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50">
          <div className="text-sm text-gray-500">Arousal</div>
          <div className="text-xl font-semibold">{(arousal*100).toFixed(0)}%</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h4 className="font-semibold">{recTitle}</h4>
        <p className="text-sm text-gray-600">{recDesc}</p>
        <div className="mt-3">
          <button className="bg-gradient-to-r from-teal-400 to-blue-500 text-white px-4 py-2 rounded mr-2">Start</button>
          <button className="px-4 py-2 rounded border">Save to history</button>
        </div>
      </div>
    </div>
  );
}
