// src/pages/Mood.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MoodLineChart from "../components/charts/MoodLineChart";
import { SunMedium, HeartPulse, Zap, Moon, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "mindecho_mood_entries_v1";
const THEME_KEY = "mindecho_theme";

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export default function MoodTracker() {
  // theme
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") document.documentElement.classList.add("dark");
    else if (saved === "light") document.documentElement.classList.remove("dark");
    // if not set, prefer dark for this app
    if (!saved) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
    }
  }, []);

  const [entries, setEntries] = useState(() => loadEntries());
  const [rating, setRating] = useState(8);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [compactView, setCompactView] = useState(false);

  // Weekly chart data (Mon..Sun)
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      days.push({ name: label, mood: 7, iso: d.toISOString().slice(0, 10) });
    }
    days.forEach((day) => {
      const found = entries.find((e) => e.date === day.iso);
      if (found) day.mood = found.rating;
    });
    return days;
  }, [entries]);

  useEffect(() => saveEntries(entries), [entries]);

  const handleSave = (e) => {
    e?.preventDefault();
    setSaving(true);
    const iso = new Date().toISOString().slice(0, 10);
    const newEntry = {
      id: `m${Date.now()}`,
      date: iso,
      rating: Number(rating),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [newEntry, ...prev.filter((p) => p.date !== iso)].slice(0, 365));
    setNote("");
    // smooth UX feel
    setTimeout(() => setSaving(false), 350);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this mood entry?")) return;
    setEntries((prev) => prev.filter((p) => p.id !== id));
  };

  // Derived metrics
  const overallMood = useMemo(() => {
    if (!entries.length) return 7.8;
    const last7 = entries.slice(0, 7);
    const avg = last7.reduce((s, e) => s + e.rating, 0) / last7.length;
    return Math.round(avg * 10) / 10;
  }, [entries]);

  const energy = `${Math.min(99, Math.round((overallMood / 10) * 95) + 20)}%`;
  const sleep = `${Math.max(4, Math.round((overallMood / 10) * 3 + 5))}h`;
  const streak = entries.length ? Math.min(30, entries.length) : 0;

  // Daily goal (animated bottom bar) state
  const DAILY_TARGET = 1; // for mood check-in daily target (1 per day)
  const completed = entries.filter((e) => e.date === new Date().toISOString().slice(0, 10)).length;
  const progress = Math.min(1, (completed || 0) / DAILY_TARGET);

  // quick rating helpers
  const clampRating = (v) => Math.max(0, Math.min(10, Number(v)));

  // slider steps
  const setRatingStep = (step) => setRating((r) => clampRating(Number(r) + step));

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-gray-100">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <Header />

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold">Good morning — how are you feeling?</h2>
              <p className="text-sm text-gray-400 mt-1">Track mood, discover trends, and build consistency.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 bg-white/5 px-3 py-2 rounded-2xl">
                <Moon className="w-4 h-4 text-indigo-300" />
                <div className="text-xs text-gray-300">Dark</div>
              </div>

              <button
                onClick={() => setCompactView((c) => !c)}
                className="px-3 py-2 bg-white/5 rounded-lg text-sm hover:bg-white/10"
                aria-pressed={compactView}
                title="Toggle compact view"
              >
                {compactView ? "Expanded" : "Compact"}
              </button>
            </div>
          </div>

          {/* Top grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: chart + headline card */}
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36 }}
              className="lg:col-span-2 bg-gradient-to-br from-purple-700 to-indigo-700 rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Your Mood Wave</h3>
                  <p className="text-sm text-indigo-100/80">This week at a glance</p>
                </div>
                <div className="text-sm text-indigo-100/80">Weekly</div>
              </div>

              {/* Chart container: explicit minHeight to avoid recharts size warning */}
              <div
                className="w-full rounded-xl overflow-hidden bg-white/5 p-3"
                style={{ minHeight: 220, minWidth: 280 }}
                aria-hidden={false}
              >
                <div className="h-44 md:h-56 lg:h-64">
                  {/* Your chart component — wrapper ensures size > 0 */}
                  <MoodLineChart
                    data={chartData.map((d) => ({ ...d, mood: Number(d.mood) }))}
                    // If MoodLineChart accepts style/height props you can pass them here:
                    // style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/6 rounded-lg p-3 text-white">
                  <div className="text-xs text-indigo-200">Overall Mood</div>
                  <div className="text-xl font-bold">{overallMood}</div>
                </div>

                <div className="bg-white/6 rounded-lg p-3 text-white">
                  <div className="text-xs text-indigo-200">Energy</div>
                  <div className="text-xl font-bold">{energy}</div>
                </div>

                <div className="bg-white/6 rounded-lg p-3 text-white">
                  <div className="text-xs text-indigo-200">Sleep</div>
                  <div className="text-xl font-bold">{sleep}</div>
                </div>
              </div>
            </motion.section>

            {/* Right: quick calm card + input */}
            <motion.aside
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.04 }}
              className="rounded-2xl p-4 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-800 shadow-lg"
            >
              {/* quick calm */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white mb-3 shadow-lg">
                  <Play className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-white">Quick Calm</h4>
                <p className="text-xs text-gray-400 mt-1">3-minute breathing to center yourself</p>
                <button
                  onClick={() => alert("3-minute session (demo)")}
                  className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-green-400 to-blue-500 text-black px-3 py-2 rounded-full text-sm font-medium shadow"
                >
                  Start 3-min
                </button>
              </div>

              <hr className="border-gray-700 my-3" />

              {/* Mood input */}
              <div>
                <label htmlFor="rating" className="text-sm font-medium text-gray-200 block mb-2">
                  Today's Mood — <span className="text-xs text-gray-400">0 (low) — 10 (high)</span>
                </label>

                <div className="flex items-center gap-3">
                  {/* circular big rating display */}
                  <div className="relative flex-shrink-0">
                    <div className="w-28 h-28 rounded-full bg-white/6 flex items-center justify-center">
                      <div className="text-3xl font-bold">{rating}</div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {/* decorative ring */}
                      <svg width="110" height="110" viewBox="0 0 36 36" className="transform -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none" />
                        <path
                          d={`M18 2.0845 a 15.9155 15.9155 0 0 1 ${Math.max(0.01, (rating / 10) * 31.831).toFixed(3)} 0`}
                          stroke="url(#g1)"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <defs>
                          <linearGradient id="g1" x1="0" x2="1">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#60a5fa" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* slider + stepper */}
                  <div className="flex-1">
                    <input
                      id="rating"
                      aria-label="Mood rating"
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={rating}
                      onChange={(e) => setRating(clampRating(Number(e.target.value)))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        <button onClick={() => setRatingStep(-2)} className="px-2 py-1 rounded bg-white/6 text-sm">-2</button>
                        <button onClick={() => setRatingStep(-1)} className="px-2 py-1 rounded bg-white/6 text-sm">-1</button>
                        <button onClick={() => setRatingStep(1)} className="px-2 py-1 rounded bg-white/6 text-sm">+1</button>
                        <button onClick={() => setRatingStep(2)} className="px-2 py-1 rounded bg-white/6 text-sm">+2</button>
                      </div>

                      <div className="ml-auto text-xs text-gray-400">Streak: <strong className="ml-1">{streak}</strong></div>
                    </div>
                  </div>
                </div>

                <label htmlFor="note" className="text-sm font-medium text-gray-200 block mt-4 mb-2">Note (optional)</label>
                <textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What are you noticing? (thoughts, gratitude, sleep, triggers...)"
                  className="w-full rounded-lg bg-white/5 border border-gray-800 p-2 text-sm text-gray-100 placeholder:text-gray-500"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 rounded-lg text-white shadow hover:brightness-105 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save entry"}
                  </button>
                  <button
                    onClick={() => { setNote(""); setRating(8); }}
                    className="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </motion.aside>
          </div>

          {/* Recent entries + tips */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/5 rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Recent Entries</h4>
                <div className="text-sm text-gray-400">{entries.length} total</div>
              </div>

              {entries.length === 0 ? (
                <div className="text-sm text-gray-400 p-6">No entries yet — record your mood daily to unlock insights.</div>
              ) : (
                <div className="space-y-3">
                  {entries.map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="p-3 bg-white/6 rounded-lg border border-gray-800 flex justify-between items-start"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</div>
                        <div className="mt-1 font-semibold text-white">{e.rating} / 10</div>
                        {e.note && <div className="text-sm text-gray-300 mt-1 break-words">{e.note}</div>}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button onClick={() => handleDelete(e.id)} className="text-sm text-red-400 hover:underline">Delete</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <aside className="rounded-2xl p-4 bg-white/6 border border-gray-800">
              <h4 className="text-lg font-semibold mb-3">Wellness Tips</h4>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>Hydrate earlier in the day — small wins stack.</li>
                <li>Short breathing sessions (2–3 min) reduce reactivity.</li>
                <li>Note one thing you're grateful for daily.</li>
              </ul>

              <div className="mt-4">
                <button onClick={() => alert("Open tips (demo)")} className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-black font-medium">
                  Explore Guided Practices
                </button>
              </div>
            </aside>
          </div>

          {/* Animated daily goal bar (floating) */}
          <AnimatePresence>
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 20 }}
              className="fixed left-4 right-4 bottom-6 md:left-8 md:right-8 z-50 pointer-events-auto"
            >
          
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// small clamp helper
function clampRating(v) {
  return Math.max(0, Math.min(10, Number(v)));
}
