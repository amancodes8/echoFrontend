// src/pages/InferPage.jsx
import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { httpClient } from "../api/httpClient";
import ResultCard from "../components/ResultCard";

export default function InferPage() {
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [eeg, setEeg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const fd = new FormData();
      if (image) fd.append("image", image);
      if (audio) fd.append("audio", audio);
      if (eeg) fd.append("eeg", eeg);
      fd.append("user_id", user?.id || "guest");

      // use fetch because httpClient expects JSON; we need multipart/form-data
      const res = await fetch(`${import.meta.env.VITE_FASTAPI_URL || "http://127.0.0.1:8000"}/infer`, {
        method: "POST",
        body: fd
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }

      const data = await res.json();
      // convert raw emotion_dist to readable label + confidence
      const labels = ["Anger","Disgust","Fear","Sad","Neutral","Happy","Surprise"];
      const topIndex = data.emotion_dist.indexOf(Math.max(...data.emotion_dist));
      const primary = labels[topIndex] || "Unknown";
      setResult({...data, primary});
    } catch (err) {
      setError(err.message || "Inference failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <Header />
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Multimodal Inference</h2>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow space-y-4">
            <div>
              <label className="block text-sm font-medium">Image (optional)</label>
              <input type="file" accept="image/*" onChange={(e)=>setImage(e.target.files[0])} />
            </div>

            <div>
              <label className="block text-sm font-medium">Audio (optional)</label>
              <input type="file" accept="audio/*" onChange={(e)=>setAudio(e.target.files[0])} />
            </div>

            <div>
              <label className="block text-sm font-medium">EEG (optional .json/.npy)</label>
              <input type="file" accept=".json,.npy" onChange={(e)=>setEeg(e.target.files[0])} />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="bg-purple-600 text-white py-2 px-4 rounded" disabled={loading}>
                {loading ? "Analyzing..." : "Run Inference"}
              </button>
              <div className="text-sm text-gray-500">Signed in as <strong>{user?.profile?.displayName || user?.name || "Guest"}</strong></div>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </form>

          {result && (
            <div className="mt-6">
              <ResultCard result={result} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
