import React from 'react';
import { Frown, Smile, Brain, Meh } from 'lucide-react';

const config = {
  anxious: { icon: Frown, color: 'text-red-500', bg: 'bg-red-50', label: 'Anxious' },
  calm: { icon: Smile, color: 'text-green-500', bg: 'bg-green-50', label: 'Calm' },
  focused: { icon: Brain, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Focused' },
  neutral: { icon: Meh, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Neutral' },
};

export default function EmotionMeter({ emotion }) {
  const { primary, scores } = emotion || {};
  const mood = config[primary] || config.neutral;
  const Icon = mood.icon;

  return (
    <div className={`py-2 px-4 rounded-2xl shadow-sm border ${mood.bg} h-full flex flex-col justify-between`}>
      <div>
        <div className="flex items-center mb-2">
          <h3 className="text-md font-bold text-gray-800">Current Emotion:</h3>
          <div className={`flex items-center font-semibold ${mood.color}`}>
            <Icon className="w-5 h-5 mr-1.5" /> {mood.label}
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Real-time inference from neuro, facial, and acoustic signals.
        </p>
      </div>

      <div className="space-y-3 mb-2">
        <Progress label="Anxiety" value={scores?.anxiety || 0} />
        <Progress label="Calm" value={scores?.calm || 0} />
        <Progress label="Focus" value={scores?.focus || 0} />
      </div>
    </div>
  );
}

function Progress({ label, value }) {
  const percent = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1 font-medium text-gray-700">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-purple-600 transition-all"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}
