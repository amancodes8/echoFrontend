// src/pages/Journal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Trash2,
  Download,
  Search,
  X,
  BookOpen,
  Save,
  Edit3,
} from "lucide-react";

const STORAGE_KEY = "mindecho_journal_v1";
const DRAFT_KEY = "mindecho_journal_draft_v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : { title: "", body: "" };
  } catch {
    return { title: "", body: "" };
  }
}
function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState(() => load());
  const [draft, setDraft] = useState(() => loadDraft());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null); // view modal
  const [showEditor, setShowEditor] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const mountedRef = useRef(false);

  // sync entries to localStorage
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    save(entries);
  }, [entries]);

  // autosave draft (debounced)
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
        <LoadingSpinner />
      </div>
    );

  const addEntry = (e) => {
    e?.preventDefault?.();
    if (!draft.body?.trim() && !draft.title?.trim()) return;

    setSaving(true);
    const newEntry = {
      id: `j${Date.now()}`,
      userId: user.id,
      title: draft.title?.trim() || new Date().toLocaleString(),
      body: draft.body,
      createdAt: new Date().toISOString(),
    };
    setEntries((p) => [newEntry, ...p].slice(0, 2000));
    setDraft({ title: "", body: "" });
    setShowEditor(false);
    setSaving(false);
  };

  const updateDraftField = (field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const remove = (id) => {
    if (!window.confirm("Delete this entry?")) return;
    setEntries((p) => p.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindecho_journal_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries.filter((en) => {
      if (!q) return true;
      return (
        (en.title || "").toLowerCase().includes(q) ||
        (en.body || "").toLowerCase().includes(q)
      );
    });
    list = list.sort((a, b) =>
      sortNewest ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [entries, query, sortNewest]);

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <Header />

        <div className="max-w-6xl mx-auto">
          {/* Top header area */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold">Journal</h2>
              <p className="text-sm text-gray-400 mt-1">Capture thoughts, gratitude, and reflections. Private to your browser.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-full px-3 py-2 w-full md:w-auto">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="bg-transparent outline-none placeholder:text-gray-500 flex-1 text-sm text-gray-200"
                />
                {query && (
                  <button
                    className="ml-2 p-1 rounded hover:bg-gray-700"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              <button
                onClick={() => { setShowEditor((s) => !s); setSelected(null); }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-md hover:brightness-105"
                title="New entry"
              >
                <PlusCircle className="w-4 h-4" />
                New
              </button>

              <div className="hidden sm:flex items-center gap-2 ml-2">
                <button
                  onClick={() => setSortNewest((s) => !s)}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-800/90"
                  title="Toggle sort"
                >
                  {sortNewest ? "Newest" : "Oldest"}
                </button>

                <button
                  onClick={exportAll}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-800/90 flex items-center gap-2"
                  title="Export entries"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor / Compose */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`lg:col-span-2 ${showEditor ? "" : "hidden lg:block"}`}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Write an entry</h3>
                    <p className="text-xs text-gray-400 mt-1">Daily reflections help you notice patterns over time.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDraft({ title: "", body: "" }); saveDraft({ title: "", body: "" }); }}
                      className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => { save(entries); saveDraft(draft); }}
                      className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700 flex items-center gap-2"
                      title="Save draft"
                    >
                      <Save className="w-4 h-4" /> Draft
                    </button>
                  </div>
                </div>

                <form onSubmit={addEntry} className="mt-4">
                  <input
                    value={draft.title}
                    onChange={(e) => updateDraftField("title", e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder:text-gray-500"
                  />
                  <textarea
                    value={draft.body}
                    onChange={(e) => updateDraftField("body", e.target.value)}
                    placeholder="Write your thoughts, gratitude, or observations..."
                    rows={8}
                    className="w-full mt-3 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder:text-gray-500 resize-none"
                  />

                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-md hover:brightness-105"
                    >
                      <BookOpen className="w-4 h-4" />
                      {saving ? "Saving..." : "Add Entry"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowEditor(false); setDraft(loadDraft()); }}
                      className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700"
                    >
                      Close
                    </button>

                    <div className="ml-auto text-sm text-gray-400">Autosaves locally</div>
                  </div>
                </form>
              </div>
            </motion.section>

            {/* Right column: list + actions */}
            <aside className="bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Recent Entries</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowEditor(true); setSelected(null); }}
                    className="p-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                    title="New entry"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportAll}
                    className="p-2 rounded-md bg-gray-900 border border-gray-700 text-gray-200"
                    title="Export JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                {filtered.length === 0 && (
                  <div className="text-xs text-gray-400">No entries match your search.</div>
                )}

                {filtered.map((en) => (
                  <motion.div
                    key={en.id}
                    layout
                    whileHover={{ scale: 1.01 }}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          onClick={() => setSelected(en)}
                          className="text-left w-full"
                          title="Open entry"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-100 truncate">{en.title}</div>
                            <div className="text-xs text-gray-500">{new Date(en.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="mt-2 text-xs text-gray-300 line-clamp-3 whitespace-pre-wrap">{en.body}</div>
                        </button>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => {
                            // quick edit: load into draft and open editor
                            setDraft({ title: en.title, body: en.body });
                            setShowEditor(true);
                            // remove old entry (will be re-added on save)
                            setEntries((p) => p.filter((x) => x.id !== en.id));
                          }}
                          className="p-1 rounded hover:bg-gray-800"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4 text-gray-300" />
                        </button>

                        <button
                          onClick={() => remove(en.id)}
                          className="p-1 rounded hover:bg-gray-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </aside>
          </div>
        </div>

        {/* Entry modal / viewer */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSelected(null)}
              />

              <motion.div
                initial={{ y: 12, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 12, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="relative z-10 max-w-3xl w-full bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl text-gray-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{selected.title}</h3>
                    <div className="text-xs text-gray-400 mt-1">{new Date(selected.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(null)} className="p-2 rounded hover:bg-gray-800">
                      <X className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-200 whitespace-pre-wrap">{selected.body}</div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs text-gray-400">Private — saved only in this browser</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // quick export single entry
                        const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `journal_entry_${selected.id}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export
                    </button>

                    <button
                      onClick={() => {
                        setDraft({ title: selected.title, body: selected.body });
                        setSelected(null);
                        setShowEditor(true);
                        // remove existing (we'll save as new)
                        setEntries((p) => p.filter((x) => x.id !== selected.id));
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-md text-sm text-white flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
