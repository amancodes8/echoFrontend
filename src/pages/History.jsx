// src/pages/History.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import mockApi from '../api/mockApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileDown, Filter, Calendar, X, ArrowLeft, ArrowRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [6, 12, 24];

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function SkeletonItem() {
  return (
    <div className="animate-pulse p-4 rounded-lg bg-gray-800/50 border border-gray-800">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700 rounded w-2/5" />
          <div className="h-3 bg-gray-700 rounded w-1/3 mt-2" />
        </div>
        <div className="w-20 h-8 bg-gray-700 rounded" />
      </div>
      <div className="mt-3 h-3 bg-gray-700 rounded w-full" />
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [visibleSessions, setVisibleSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // controls
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | breathing | meditation | mindful | other
  const [dateFilter, setDateFilter] = useState('30d'); // today | 7d | 30d | all
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    mockApi.getHistory(user.id)
      .then((res) => {
        // ensure consistent shape
        const normalized = Array.isArray(res) ? res.map((s) => ({
          id: s.id || s._id || `${s.type}-${s.timestamp || Date.now()}`,
          type: s.type || 'session',
          timestamp: s.timestamp || s.createdAt || Date.now(),
          duration: s.duration || (s.seconds ? s.seconds : 0),
          startEmotion: s.startEmotion || s.from || 'unknown',
          endEmotion: s.endEmotion || s.to || 'unknown',
          summary: s.summary || s.note || '',
          meta: s.meta || {},
        })) : [];
        // sort descending
        normalized.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        setSessions(normalized);
      })
      .catch((err) => {
        console.error('getHistory failed', err);
        setError('Failed to load history. Try again later.');
        setSessions([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Filtering logic
  const filtered = useMemo(() => {
    const now = Date.now();
    const daysAgo = (d) => now - d * 24 * 60 * 60 * 1000;
    const cutoff =
      dateFilter === 'today' ? daysAgo(1) :
      dateFilter === '7d' ? daysAgo(7) :
      dateFilter === '30d' ? daysAgo(30) : 0;

    return sessions.filter((s) => {
      if (typeFilter !== 'all' && (s.type || 'session').toLowerCase() !== typeFilter) return false;
      if (cutoff && new Date(s.timestamp).getTime() < cutoff) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(`${s.type} ${s.summary} ${s.startEmotion} ${s.endEmotion}`.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [sessions, query, typeFilter, dateFilter]);

  // pagination
  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, dateFilter, pageSize]);

  useEffect(() => {
    const start = (page - 1) * pageSize;
    setVisibleSessions(filtered.slice(start, start + pageSize));
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const handleExport = () => {
    setExporting(true);
    try {
      const toExport = filtered; // export filtered set
      const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindecho_history_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('export failed', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const typeOptions = useMemo(() => {
    const types = new Set(sessions.map(s => (s.type || 'session').toLowerCase()));
    return ['all', ...Array.from(types)];
  }, [sessions]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-gray-100">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <Header />

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold">Activity History</h2>
              <p className="text-sm text-gray-400 mt-1">All your practice sessions — searchable, filterable, and exportable.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by type, note, emotion..."
                  className="pl-10 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Search sessions"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1 border border-gray-700">
                <Filter className="w-4 h-4 text-gray-300" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none"
                  aria-label="Filter by type"
                >
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1 border border-gray-700">
                <Calendar className="w-4 h-4 text-gray-300" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none"
                  aria-label="Filter by date"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All</option>
                </select>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-black text-sm shadow"
                aria-label="Export sessions"
              >
                <FileDown className="w-4 h-4" /> {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* header row for list */}
            <div className="hidden md:flex items-center justify-between text-xs text-gray-400 px-2">
              <div className="w-2/5">Session</div>
              <div className="w-1/5 text-right">Duration</div>
              <div className="w-1/5 text-right">Start → End</div>
              <div className="w-1/5 text-right">When</div>
            </div>

            {/* content */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({length: 4}).map((_,i) => <SkeletonItem key={i} />)}
              </div>
            ) : error ? (
              <div className="p-6 bg-gray-800/60 rounded-lg border border-red-700 text-red-300">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 bg-gray-800/50 rounded-lg border border-dashed border-gray-700 text-gray-400">
                No sessions match your filters. Try widening the date range or clearing the search.
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {visibleSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      layout
                      className="p-4 rounded-lg bg-gradient-to-b from-gray-800/40 to-gray-900/40 border border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 md:w-2/5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {String(session.type || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{session.type || 'Session'}</div>
                            <div className="text-xs text-gray-400 truncate mt-1">{session.summary || 'No notes'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-1/5 text-right md:text-right text-sm text-gray-300">
                        {Math.round((session.duration || 0) / 60)} min
                      </div>

                      <div className="md:w-1/5 text-right text-sm text-gray-300">
                        <div className="capitalize">{session.startEmotion || '—'} → {session.endEmotion || '—'}</div>
                      </div>

                      <div className="md:w-1/5 text-right text-xs text-gray-400">
                        {formatDate(session.timestamp)}
                      </div>

                      <div className="flex-shrink-0 md:ml-4 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="px-3 py-1 rounded-md bg-white/6 text-sm hover:bg-white/10"
                        >
                          Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* pagination + page size */}
          {!loading && filtered.length > 0 && (
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2"
                  aria-label="Prev page"
                >
                  <ArrowLeft className="w-4 h-4" /> Prev
                </button>
                <div className="text-sm text-gray-300 px-2">Page {page} of {totalPages}</div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2"
                  aria-label="Next page"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">Per page</div>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-gray-800/60 border border-gray-700 px-2 py-1 rounded-lg text-sm"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Session details modal */}
      <AnimatePresence>
        {selectedSession && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setSelectedSession(null)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed z-60 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-full p-4"
            >
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedSession.type}</h3>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(selectedSession.timestamp)}</div>
                  </div>
                  <button onClick={() => setSelectedSession(null)} className="p-2 rounded hover:bg-gray-800">
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-400">Duration</div>
                    <div className="text-sm font-semibold mt-1">{Math.round((selectedSession.duration || 0) / 60)} minutes</div>
                  </div>

                  <div className="bg-gray-800/50 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-400">Start → End</div>
                    <div className="text-sm font-semibold mt-1 capitalize">{selectedSession.startEmotion} → {selectedSession.endEmotion}</div>
                  </div>

                  <div className="md:col-span-2 bg-gray-800/50 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-400">Summary</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{selectedSession.summary || 'No summary provided.'}</div>
                  </div>

                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        // export single session
                        const blob = new Blob([JSON.stringify(selectedSession, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `session_${selectedSession.id || 'session'}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 rounded bg-indigo-600 text-black"
                    >
                      Export session
                    </button>
                    <button onClick={() => setSelectedSession(null)} className="px-3 py-2 rounded border">Close</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
