// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ConsentToggle from '../components/ConsentToggle';
import { useAuth } from '../contexts/AuthContext';
import mockApi from '../api/mockApi';
import {
  DownloadCloud,
  Trash2,
  Lock,
  CheckCircle2,
  Moon,
  Sun,
  Zap,
  Activity,
  ShieldCheck,
  Settings as Cog,
} from 'lucide-react';

/**
 * Enhanced Settings page with:
 * - Dark mode persisted
 * - Animated toggles, cards, micro-sparkline
 * - Extra UI bits: preview, quick actions, keyboard hints
 * - Accessible interactive elements
 */

// small inline sparkline SVG (stateless)
function MiniSparkline({ values = [], color = '#7c3aed' }) {
  // normalize to viewBox 0..100 x 0..20
  if (!values.length) return <div className="h-8" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1e-6, max - min);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 20 - ((v - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 20" className="w-28 h-8" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy={20 - ((values.at(-1) - min) / range) * 20} r="1.6" fill={color} />
    </svg>
  );
}

// animated toggle using framer-motion for extra polish
function AnimatedToggle({ checked, onChange, id, label }) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center h-6 w-11 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
          className={`block h-5 w-5 rounded-full bg-white shadow transform`}
          style={{ marginLeft: checked ? 19 : 2 }}
        />
      </button>
    </div>
  );
}

// Status pill (animated)
function StatusPill({ status }) {
  const ok = !!status && /saved|export|success|exported/i.test(status);
  const warn = !!status && /error|fail|failed|delete/i.test(status);
  const base = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium';
  const cls = ok ? 'bg-green-50 text-green-800 border border-green-100' : warn ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-yellow-50 text-yellow-800 border border-yellow-100';
  return (
    <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} className={`${base} ${cls}`}>
      {ok && <CheckCircle2 className="w-4 h-4 text-green-500" />}
      <span>{status || 'Unsaved changes'}</span>
    </motion.div>
  );
}

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const initialConsent = user?.consent ?? { neurofeedback: true, camera: true, audio: true };
  const [consent, setConsent] = useState(initialConsent);
  const [status, setStatus] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('mindecho_theme');
      return saved ? saved === 'dark' : true; // default to dark for this app
    } catch {
      return true;
    }
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  // fake activity numbers for UI
  const activityVals = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => Math.sin(i / 2) * 10 + 30 + Math.random() * 4);
    return base.map((v) => Math.max(0, v));
  }, []);

  useEffect(() => {
    // persist theme and apply dark class
    try {
      localStorage.setItem('mindecho_theme', darkMode ? 'dark' : 'light');
      const root = document.documentElement;
      if (darkMode) root.classList.add('dark');
      else root.classList.remove('dark');
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    // auto-clear some statuses
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const handleSave = async () => {
    setStatus('Saving settings...');
    try {
      // call your real API; mockApi used here
      const updated = await mockApi.updateConsent(user.id, consent);
      updateUser && updateUser(updated);
      setStatus('Settings saved');
    } catch (err) {
      console.error(err);
      setStatus('Error saving settings');
    }
  };

  const handleExport = async () => {
    setStatus('Preparing export...');
    try {
      const data = await mockApi.exportData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindecho_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Exported');
    } catch (err) {
      console.error(err);
      setStatus('Export failed');
    }
  };

  const handleDelete = async () => {
    setBusyDelete(true);
    setStatus('Deleting account...');
    try {
      await mockApi.deleteData(user.id);
      await logout();
    } catch (err) {
      console.error(err);
      setStatus('Delete failed');
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <div className={`flex min-h-screen bg-gradient-to-b ${darkMode ? 'from-gray-900 to-black text-gray-100' : 'from-slate-50 to-white text-gray-900'}`}>
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <Header />

        <div className="max-w-6xl mx-auto space-y-6">
          {/* top row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Settings</h1>
              <p className="text-sm text-gray-400 mt-1">Manage permissions, privacy, and app appearance.</p>
            </div>

            <div className="flex items-center gap-3">
              <StatusPill status={status} />
              <button
                onClick={() => setDarkMode((d) => !d)}
                className="p-2 rounded-lg bg-white/6 hover:bg-white/10 focus:outline-none"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>

          {/* grid: left (controls) / right (preview + quick cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* left column: consent + actions */}
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`lg:col-span-2 rounded-2xl p-6 ${darkMode ? 'bg-gray-850 border border-gray-800' : 'bg-white border border-gray-100'} shadow-lg`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Sensor Consent</h2>
                  <p className="text-sm text-gray-400 mt-1">MindEcho processes on-device signals — toggle what you're comfortable sharing.</p>
                </div>

                <div className="text-xs text-gray-400">
                  Account: <span className="font-medium">{user?.email || user?.name || 'Guest'}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border dark:border-gray-800 bg-white/6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Neurofeedback</div>
                      <div className="text-xs text-gray-400 mt-1">Simulated EEG for focus & calm metrics</div>
                    </div>
                    <AnimatedToggle id="t-neuro" checked={!!consent.neurofeedback} onChange={(v) => setConsent((c) => ({ ...c, neurofeedback: v }))} />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-400">Recent</div>
                    <MiniSparkline values={activityVals.map((v) => v / 2)} color={darkMode ? '#7c3aed' : '#6d28d9'} />
                  </div>
                </div>

                <div className="p-4 rounded-xl border dark:border-gray-800 bg-white/6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Micro-emotion (Camera)</div>
                      <div className="text-xs text-gray-400 mt-1">On-device face expression analysis</div>
                    </div>
                    <AnimatedToggle id="t-camera" checked={!!consent.camera} onChange={(v) => setConsent((c) => ({ ...c, camera: v }))} />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-400">Privacy</div>
                    <div className="text-xs font-medium text-indigo-300">On-device</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border dark:border-gray-800 bg-white/6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Acoustic Sentiment</div>
                      <div className="text-xs text-gray-400 mt-1">Voice-based wellbeing signals</div>
                    </div>
                    <AnimatedToggle id="t-audio" checked={!!consent.audio} onChange={(v) => setConsent((c) => ({ ...c, audio: v }))} />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-400">Last run</div>
                    <div className="text-xs font-medium">{new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <motion.button onClick={handleSave} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 rounded-lg text-white shadow">
                  Save Settings
                </motion.button>
                <button onClick={() => setConsent(initialConsent)} className="px-3 py-2 rounded-lg border text-sm">Reset</button>

                <div className="ml-auto text-xs text-gray-400">Tip: press <kbd className="px-2 py-1 rounded bg-black/10 text-xs">S</kbd> to Save</div>
              </div>

              {/* extra features */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <motion.div whileHover={{ y: -3 }} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-800' : 'border-gray-100'} bg-white/5`}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="text-sm font-semibold">Privacy-first</div>
                      <div className="text-xs text-gray-400 mt-1">All face processing stays on your device unless explicitly uploaded.</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -3 }} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-800' : 'border-gray-100'} bg-white/5`}>
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-400" />
                    <div>
                      <div className="text-sm font-semibold">Local Inference</div>
                      <div className="text-xs text-gray-400 mt-1">Fast, offline-capable inference for quick feedback loops.</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.section>

            {/* right column: preview, quick actions, account */}
            <motion.aside initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-6 ${darkMode ? 'bg-gray-850 border border-gray-800' : 'bg-white border border-gray-100'} shadow-lg space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Theme preview</div>
                  <div className="text-xs text-gray-400 mt-1">Live preview of the current theme</div>
                </div>
                <div className="text-xs text-gray-400">Mode</div>
              </div>

              <div className="rounded-xl overflow-hidden border border-gray-700">
                <div className="p-3 flex items-center gap-3 bg-gradient-to-b from-gray-800 to-gray-900">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">ME</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">MindEcho</div>
                    <div className="text-xs text-gray-300 mt-0.5">Dark theme — contrast optimized</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MiniSparkline values={activityVals.map((v) => v / 3)} color="#a78bfa" />
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-b from-white/6 to-white/2 flex items-center justify-between">
                  <div className="text-xs text-gray-300">Accent</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <div className="w-3 h-3 rounded-full bg-purple-600" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <button onClick={handleExport} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10">
                  <DownloadCloud className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Export my data</div>
                    <div className="text-xs text-gray-400">Download profile, sessions & signals</div>
                  </div>
                </button>

                <button onClick={() => setConfirmOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400">
                  <Trash2 className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Delete my account</div>
                    <div className="text-xs text-red-300">This action is permanent</div>
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-gray-700/40">
                <div className="text-xs text-gray-400">Account</div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{user?.profile?.displayName || user?.name || 'Guest'}</div>
                    <div className="text-xs text-gray-400">{user?.email}</div>
                  </div>
                  <div className="text-xs text-gray-400">ID: <span className="font-mono ml-2 text-xs">{String(user?.id).slice(0, 8)}</span></div>
                </div>
              </div>
            </motion.aside>
          </div>

          {/* bottom: larger feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div whileHover={{ y: -6 }} className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-850 border border-gray-800' : 'bg-white border border-gray-100'} shadow`}>
              <div className="flex items-center gap-3">
                <Cog className="w-6 h-6 text-indigo-400" />
                <div>
                  <div className="text-sm font-semibold">Integrations</div>
                  <div className="text-xs text-gray-400 mt-1">Connect third-party analytics or video call services.</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-lg bg-white/6 text-sm">Manage</button>
                <button className="px-3 py-2 rounded-lg bg-white/6 text-sm">Add token</button>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -6 }} className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-850 border border-gray-800' : 'bg-white border border-gray-100'} shadow`}>
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-green-400" />
                <div>
                  <div className="text-sm font-semibold">Usage</div>
                  <div className="text-xs text-gray-400 mt-1">Sessions & recent events</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-400">Sessions</div>
                  <div className="font-medium"> {user?.stats?.sessions ?? 0} </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Notes</div>
                  <div className="font-medium"> {user?.stats?.notes ?? 0} </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Last</div>
                  <div className="font-medium">{user?.lastActive ? new Date(user.lastActive).toLocaleDateString() : '—'}</div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -6 }} className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-850 border border-gray-800' : 'bg-white border border-gray-100'} shadow`}>
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="text-sm font-semibold">Quick actions</div>
                  <div className="text-xs text-gray-400 mt-1">Shortcuts for common tasks</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-lg bg-white/6">Take snapshot</button>
                <button className="px-3 py-2 rounded-lg bg-white/6">Start quick session</button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* confirm delete modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-50">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete account?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">This action is permanent. All your data will be removed and you will be logged out.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={handleDelete} disabled={busyDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white">
                  {busyDelete ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </motion.div>

            <motion.div onClick={() => setConfirmOpen(false)} className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
