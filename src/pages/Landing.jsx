import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Brain } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex justify-between items-center p-6">
        <div className="flex items-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg mr-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-800">MindEcho</span>
        </div>
        <div>
          <button onClick={() => navigate('/login')} className="text-gray-600 font-medium mr-4">Login</button>
          <button onClick={() => navigate('/signup')} className="bg-purple-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-purple-700">Sign Up</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-8">
          <Brain className="w-12 h-12 text-purple-500" />
        </div>
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Meet your responsive
          <br />
          <span className="text-purple-600">Emotional Mirror</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-8">
          MindEcho reads your body's real-time signals to provide adaptive feedback, helping you regulate and retrain your emotional reflexes.
        </p>
        <div className="space-x-3">
          <button onClick={() => navigate('/signup')} className="bg-purple-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300">
            Begin Your Journey
          </button>
          <button onClick={() => navigate('/login')} className="bg-white text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg">
            I already have an account
          </button>
        </div>
      </main>
    </div>
  );
}
