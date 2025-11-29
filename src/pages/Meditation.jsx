// src/pages/Meditation.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2,
  VolumeX,
  Clock,
  RefreshCw,
} from "lucide-react";

const STORAGE_SESSIONS_KEY = "mindecho_meditation_sessions_v1";

const speedPresets = {
  slow: { duration: 8, label: "Slow", inSec: 4, holdSec: 4, outSec: 4 },
  normal: { duration: 6, label: "Normal", inSec: 3, holdSec: 3, outSec: 3 },
  fast: { duration: 4, label: "Fast", inSec: 2, holdSec: 2, outSec: 2 },
};

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

export default function Meditation() {
  const [speed, setSpeed] = useState("normal");
  const [playing, setPlaying] = useState(false);
  const [phaseText, setPhaseText] = useState("Ready");
  const [breaths, setBreaths] = useState(0);

  // timer for session
  const [sessionRunning, setSessionRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const sessionStartRef = useRef(null); // stable ref for start timestamp

  // ambient audio toggle (optional). set audioSrc to a quiet loop URL if you want sound.
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef(null);
  const audioSrc = ""; // <-- optional: put a calm loop URL here

  const [sessions, setSessions] = useState(() => loadSessions());

  // SVG breathing ring params
  const R = 64;
  const C = 2 * Math.PI * R;

  // Breathing loop: cycles in/hold/out according to chosen speed
  useEffect(() => {
    let interval = null;
    let timeouts = [];
    if (playing) {
      // cycle through in -> hold -> out
      const dur = speedPresets[speed].duration * 1000;
      const step = dur / 3;

      const run = () => {
        setPhaseText(`Breathe In (${speedPresets[speed].inSec}s)`);
        const t1 = setTimeout(() => {
          setPhaseText(`Hold (${speedPresets[speed].holdSec}s)`);
          const t2 = setTimeout(() => {
            setPhaseText(`Breathe Out (${speedPresets[speed].outSec}s)`);
            setBreaths((b) => b + 1);
          }, step);
          timeouts.push(t2);
        }, step);
        timeouts.push(t1);
      };

      // run immediately then on interval
      run();
      interval = setInterval(run, speedPresets[speed].duration * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [playing, speed]);

  // Session timer management (uses stable ref to avoid stale state in interval)
  useEffect(() => {
    if (sessionRunning) {
      if (!sessionStartRef.current) sessionStartRef.current = Date.now();
      // start interval
      timerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        setElapsed(diff);
      }, 250);
    } else {
      // stop interval but keep elapsed as-is (so user can save)
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [sessionRunning]);

  // update audio play state
  useEffect(() => {
    if (!audioRef.current) return;
    try {
      if (soundOn && audioSrc) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {}
  }, [soundOn, audioSrc]);

  // keyboard shortcuts: space toggles play/pause, s starts/stops session
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // toggle session
        setSessionRunning((s) => {
          const next = !s;
          if (next) {
            sessionStartRef.current = Date.now();
            setElapsed(0);
            setBreaths(0);
            setPlaying(true);
          } else {
            setPlaying(false);
          }
          return next;
        });
      } else if (e.key && e.key.toLowerCase() === "r") {
        e.preventDefault();
        // reset
        setSessionRunning(false);
        setElapsed(0);
        sessionStartRef.current = null;
        setBreaths(0);
        setPlaying(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // controls
  const togglePlaying = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const toggleSession = useCallback(() => {
    setSessionRunning((s) => {
      const next = !s;
      if (next) {
        sessionStartRef.current = Date.now();
        setElapsed(0);
        setBreaths(0);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    setSessionRunning(false);
    setElapsed(0);
    sessionStartRef.current = null;
    setBreaths(0);
    setPlaying(false);
  }, []);

  // save session and compute simple metrics
  const saveSession = useCallback(() => {
    const duration = elapsed;
    // breaths recorded during session (counted when completing a full in/hold/out)
    const breathsCount = breaths;
    const breathsPerMin = duration > 0 ? Math.round((breathsCount / duration) * 60) : 0;

    const newSession = {
      id: `s${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration,
      breaths: breathsCount,
      speed,
      breathsPerMin,
    };
    const updated = [newSession, ...sessions].slice(0, 50);
    setSessions(updated);
    saveSessions(updated);

    // quick micro-feedback
    setTimeout(() => {
      setPlaying(false);
    }, 120);
    resetSession();
  }, [elapsed, breaths, speed, sessions, resetSession]);

  const removeSession = (id) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    saveSessions(filtered);
  };

  // format elapsed into mm:ss
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // compute activity metrics (avg duration, avg breaths/min, streaks)
  const activity = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { avgDur: 0, avgBPM: 0, totalSessions: 0, last7: [] };
    }
    const total = sessions.reduce((acc, s) => {
      acc.duration += s.duration || 0;
      acc.bpm += s.breathsPerMin || 0;
      return acc;
    }, { duration: 0, bpm: 0 });
    const avgDur = Math.round((total.duration / sessions.length) || 0);
    const avgBPM = Math.round((total.bpm / sessions.length) || 0);

    // build last 10 durations array for graph
    const last = sessions.slice(0, 10).map((s) => ({ t: s.timestamp, duration: s.duration || 0, bpm: s.breathsPerMin || 0 }));

    return {
      avgDur,
      avgBPM,
      totalSessions: sessions.length,
      last,
    };
  }, [sessions]);

  // compute ring animation (keeps the previous behaviour)
  const ringAnimation = useMemo(() => {
    return {
      animate: {
        strokeDashoffset: ["0", -C * 0.36, "0"],
        strokeOpacity: [1, 0.7, 1],
        transform: ["rotate(-90deg) scale(1)", "rotate(-90deg) scale(1.03)", "rotate(-90deg) scale(1)"],
      },
      transition: {
        duration: speedPresets[speed].duration,
        repeat: Infinity,
        ease: "easeInOut",
      },
    };
  }, [speed, C]);

  // Graph helpers: simple sparkline / bar graph for last sessions
  const graphData = activity.last;
  const graphMax = graphData.length ? Math.max(...graphData.map((d) => d.duration)) : 1;

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <Header />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main meditation card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-2 relative bg-gradient-to-b from-gray-800/70 to-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-3xl shadow-2xl p-6 overflow-hidden"
          >
            {/* Decorative particles (soft) */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-6 top-6 w-40 h-40 rounded-full bg-purple-600/6 blur-3xl" />
              <div className="absolute right-6 bottom-10 w-56 h-56 rounded-full bg-indigo-600/6 blur-3xl" />
            </div>

            <header className="flex items-start justify-between mb-4 gap-4 relative z-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-white">Guided Breathing</h2>
                <p className="text-sm text-gray-300 mt-1">
                  A focused, distraction-free breathing exercise. Tip: press <span className="font-medium">Space</span> to toggle the breath visual.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 bg-gray-800/60 px-3 py-2 rounded-xl border border-gray-700">
                  <Clock className="w-4 h-4 text-gray-300" />
                  <div className="text-sm font-medium text-white">{formatTime(elapsed)}</div>
                </div>

                <div className="inline-flex items-center gap-2 bg-gray-800/60 px-3 py-2 rounded-xl border border-gray-700">
                  <div className="text-sm text-gray-300">Speed</div>
                  <div className="text-sm font-medium text-white">{speedPresets[speed].label}</div>
                </div>
              </div>
            </header>

            {/* Breathing visual */}
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              {/* Left: breathing SVG + center */}
              <div className="flex-1 flex items-center justify-center py-6">
                <div className="relative flex items-center justify-center">
                  {/* stronger halo */}
                  <motion.div
                    animate={
                      playing
                        ? { scale: [1, 1.35, 1], opacity: [0.95, 0.6, 0.95], filter: ["blur(28px)", "blur(18px)", "blur(28px)"] }
                        : { scale: 1, opacity: 0.85, filter: "blur(28px)" }
                    }
                    transition={{ duration: Math.max(1.8, speedPresets[speed].duration / 1.2), repeat: Infinity, ease: "easeInOut" }}
                    className="absolute rounded-full"
                    style={{
                      width: 520,
                      height: 520,
                      background: "radial-gradient(circle at 30% 30%, rgba(139,92,246,0.18), rgba(99,102,241,0.08) 35%, rgba(79,70,229,0.02) 60%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* SVG Ring */}
                  <svg width="260" height="260" viewBox="0 0 220 220" className="relative">
                    <defs>
                      <linearGradient id="gB" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
                        <stop offset="50%" stopColor="#7c3aed" stopOpacity="1" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="1" />
                      </linearGradient>

                      {/* a faint outer glow gradient for stroked blur */}
                      <linearGradient id="gGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
                        <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.35" />
                      </linearGradient>
                    </defs>

                    <g transform="translate(110,110)">
                      {/* subtle darker base ring for contrast */}
                      <circle cx="0" cy="0" r={R} stroke="#0b1220" strokeWidth="12" fill="none" />

                      {/* blurred glow ring (behind) */}
                      <motion.circle
                        r={R}
                        stroke="url(#gGlow)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={C}
                        style={{ filter: "blur(6px)", opacity: 0.95 }}
                        animate={{
                          strokeDashoffset: [0, -C * 0.28, 0],
                          opacity: playing ? [0.9, 0.6, 0.9] : [0.85, 0.85, 0.85],
                          transform: ["rotate(-90deg) scale(1)", "rotate(-90deg) scale(1.02)", "rotate(-90deg) scale(1)"],
                        }}
                        transition={{ duration: speedPresets[speed].duration, repeat: Infinity, ease: "easeInOut" }}
                      />

                      {/* primary ring (sharp) */}
                      <motion.circle
                        r={R}
                        stroke="url(#gB)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={C}
                        {...ringAnimation}
                        style={{ mixBlendMode: "screen" }}
                      />

                      {/* inner subtle highlight */}
                      <circle cx="0" cy="0" r={R - 10} stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="none" />
                    </g>
                  </svg>

                  {/* center control */}
                  <motion.button
                    onClick={() => {
                      togglePlaying();
                    }}
                    whileTap={{ scale: 0.98 }}
                    animate={playing ? { scale: [1, 1.04, 1], boxShadow: ["0 12px 40px rgba(99,102,241,0.18)", "0 18px 60px rgba(99,102,241,0.26)", "0 12px 40px rgba(99,102,241,0.18)"] } : { scale: 1 }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    aria-pressed={playing}
                    aria-label={playing ? "Pause breathing" : "Start breathing"}
                    className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl flex flex-col items-center justify-center text-white border-2 border-white/10"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="text-sm opacity-95 mb-1">{phaseText}</div>
                    <div className="text-2xl font-semibold">{breaths} breaths</div>
                    <div className="mt-2 text-xs text-white/90">Tap or press space</div>
                  </motion.button>
                </div>
              </div>

              {/* Right: controls & info */}
              <div className="w-full md:w-96">
                <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-white">Controls</h4>
                      <p className="text-xs text-gray-400">Choose a rhythm and use the session controls below.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSoundOn((s) => !s)}
                        title={soundOn ? "Mute ambient sound" : "Enable ambient sound"}
                        className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        aria-pressed={soundOn}
                      >
                        {soundOn ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button
                        onClick={() => {
                          setSpeed("normal");
                          setPlaying(true);
                        }}
                        title="Reset to normal"
                        className="p-2 rounded-md hover:bg-gray-800"
                      >
                        <RefreshCw className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* speed selectors */}
                  <div className="flex gap-2 mb-4" role="tablist" aria-label="Select breathing speed">
                    {Object.keys(speedPresets).map((k) => {
                      const s = speedPresets[k];
                      const active = k === speed;
                      return (
                        <button
                          key={k}
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSpeed(k)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none ${
                            active
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                              : "bg-gray-800/40 text-gray-200 hover:bg-gray-800"
                          }`}
                        >
                          <div className="uppercase text-xs opacity-80">{s.label}</div>
                          <div className="mt-1 text-xs text-gray-300">
                            {s.inSec}/{s.holdSec}/{s.outSec}s
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* session controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (!sessionRunning) {
                          sessionStartRef.current = Date.now();
                          setElapsed(0);
                          setBreaths(0);
                          setSessionRunning(true);
                          setPlaying(true);
                        } else {
                          setSessionRunning(false);
                          setPlaying(false);
                        }
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    >
                      <PlayIcon className="w-4 h-4" />
                      {sessionRunning ? "Pause Session" : "Start Session"}
                    </button>

                    <button
                      onClick={() => {
                        togglePlaying();
                      }}
                      title="Pause/Resume breathing visual"
                      className="px-3 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-800 focus:outline-none"
                    >
                      {playing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <div>Elapsed: <span className="font-medium text-gray-200 ml-1">{formatTime(elapsed)}</span></div>
                    <div>Breaths: <span className="font-medium text-gray-200 ml-1">{breaths}</span></div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        if (sessionRunning) {
                          setSessionRunning(false);
                          setPlaying(false);
                          saveSession();
                        } else {
                          if (elapsed > 0) saveSession();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-md bg-white/6 text-white hover:bg-white/10"
                    >
                      Save Session
                    </button>
                    <button
                      onClick={() => {
                        resetSession();
                      }}
                      className="px-3 py-2 rounded-md bg-gray-800/40 text-gray-200 hover:bg-gray-800"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-400">
                  Shortcuts: <span className="text-white">Space</span> (toggle visual), <span className="text-white">S</span> (start/stop session), <span className="text-white">R</span> (reset).
                </div>

                {/* Activity summary */}
                <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400">Activity Score</div>
                      <div className="text-lg font-semibold text-white">{activity.avgBPM || 0} bpm • {activity.avgDur ? formatTime(activity.avgDur) : "--"}</div>
                      <div className="text-xs text-gray-400">Total sessions: <span className="text-white font-medium ml-1">{activity.totalSessions}</span></div>
                    </div>
                    <div className="w-28 h-16 flex items-center justify-center">
                      {/* mini circular indicator */}
                      <svg viewBox="0 0 36 36" className="w-20 h-20">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#111827" strokeWidth="3" />
                        <path
                          d={`M18 2.0845 a 15.9155 15.9155 0 0 1 0 ${(activity.avgDur / Math.max(activity.avgDur, 20 || 20)) * 31.831}`}
                          fill="none"
                          stroke="#7c3aed"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* small sparkline / bar graph for last sessions */}
                  <div className="mt-3 text-xs text-gray-400">Recent sessions (duration)</div>
                  <div className="mt-2 flex items-end gap-1 h-20">
                    {graphData.length === 0 && <div className="text-xs text-gray-500">No data</div>}
                    {graphData.map((d, i) => {
                      const h = graphMax ? Math.max(6, Math.round((d.duration / graphMax) * 100)) : 6;
                      return (
                        <div key={d.t} className="flex-1 flex items-end">
                          <div
                            title={`${formatTime(d.duration)} • ${d.bpm} bpm`}
                            className="w-full rounded-sm"
                            style={{
                              height: `${h}%`,
                              background: 'linear-gradient(180deg, rgba(124,58,237,0.95), rgba(79,70,229,0.8))',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* optional audio element (keeps page flexible if user adds audioSrc) */}
            {audioSrc ? <audio ref={audioRef} src={audioSrc} loop preload="auto" /> : null}
          </motion.section>

          {/* Right column: tips & history */}
          <aside className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-5 shadow-lg h-fit relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Tips</h3>
                <p className="text-xs text-gray-400 mt-1">Small practices to anchor your attention.</p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-gray-300 mb-4">
              <li>Try 5–10 minutes per session for best results.</li>
              <li>Short daily consistency is more effective than long infrequent sessions.</li>
              <li>When stressed, slow the pace — longer in/hold/out helps calm the nervous system.</li>
            </ul>

            <div className="mt-2">
              <h4 className="text-sm font-medium text-white mb-2">Session History</h4>
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                <AnimatePresence>
                  {sessions.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-gray-400">
                      No sessions yet — your saved sessions will appear here.
                    </motion.div>
                  )}
                  {sessions.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-800/40 border border-gray-700 p-2 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-gray-200">{new Date(s.timestamp).toLocaleString()}</div>
                        <div className="text-gray-400">Dur: {formatTime(s.duration)} • Breaths: {s.breaths} • Speed: {speedPresets[s.speed].label}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => {
                            setSpeed(s.speed);
                            setPlaying(true);
                            // quick demo play for up to 4s or session duration
                            setTimeout(() => setPlaying(false), Math.min(4000, (s.duration || 30) * 1000));
                          }}
                          className="px-2 py-1 rounded bg-gray-800/60 text-white text-xs"
                        >
                          Replay
                        </button>
                        <button onClick={() => removeSession(s.id)} title="Delete session" className="text-red-400 text-xs">
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
