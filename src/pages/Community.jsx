// src/pages/Community.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import mockApi from "../api/mockApi";
import LoadingSpinner from "../components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Users, UserPlus, UserMinus, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const FOLLOW_KEY = "mindecho_following_v1";

function loadFollowing() {
  try {
    const raw = localStorage.getItem(FOLLOW_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveFollowing(set) {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify([...set]));
  } catch {}
}

/**
 * Heuristic check for "real / original" profile.
 * Adjust the rules to match your backend schema (verified flag, source, etc.).
 *
 * This is intentionally conservative: if a profile looks like a stub/test,
 * it will be excluded on the client. For production, enforce on the server.
 */
function isRealProfile(p) {
  if (!p || typeof p !== "object") return false;

  // basic presence checks
  if (!p.id || typeof p.id !== "string") return false;
  if (!p.displayName || typeof p.displayName !== "string" || p.displayName.trim().length < 2) return false;

  // prefer explicit server-provided flags
  if (p.verified === true) return true; // explicitly verified by backend
  if (p.source && (p.source === "db" || p.source === "users" || p.source === "original")) return true;

  // check joinedAt timestamp (valid date and not obviously bogus)
  if (!p.joinedAt) return false;
  const d = new Date(p.joinedAt);
  if (Number.isNaN(d.getTime())) return false;
  // optionally require joined at least some minutes ago (guard against immediate test accounts)
  const ageMs = Date.now() - d.getTime();
  if (ageMs < 60 * 1000) {
    // joined < 1 min ago -> likely test; still allow if other checks pass
    // fallthrough to further checks
  }

  // avatar — require a non-placeholder avatar (best-effort)
  const avatar = p.avatarUrl || "";
  const placeholderPatterns = ["placehold.co", "placehold.it", "gravatar.com/avatar/", "placeholder", "data:image/"];
  const looksPlaceholder = placeholderPatterns.some((s) => avatar.includes(s));
  if (!avatar || looksPlaceholder) return false;

  // bio/tags — prefer some content (not required)
  const hasBioOrTags = (p.bio && p.bio.trim().length > 10) || (Array.isArray(p.tags) && p.tags.length > 0);
  if (!hasBioOrTags) {
    // still allow if other signals strong (verified or source above)
    // but because we already returned on verified/source and verified isn't set,
    // require at least some bio/tags to reduce fake accounts
    return false;
  }

  // id sanity (reject obvious test prefixes)
  const fakePrefixes = ["tmp", "test", "fake", "mock", "anon"];
  if (fakePrefixes.some((pref) => p.id.toLowerCase().startsWith(pref))) return false;

  // looks ok
  return true;
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevance"); // relevance | calm | recent
  const [viewModal, setViewModal] = useState(null);
  const [following, setFollowing] = useState(() => loadFollowing());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    mockApi
      .getProfiles()
      .then((p) => {
        if (!mounted) return;
        const list = Array.isArray(p) ? p : [];
        // Filter client-side for "real" profiles only
        const realProfiles = list.filter((prof) => {
          const ok = isRealProfile(prof);
          if (!ok) {
            console.debug("[Community] filtered fake/stub profile:", prof?.id, prof?.displayName);
          }
          return ok;
        });
        if (realProfiles.length === 0 && list.length > 0) {
          // if server returned profiles but none passed the client filter,
          // provide a helpful message (server enforcement recommended)
          setError(
            "No valid community profiles found. If you expect profiles, enable 'verified' on real accounts or ensure server returns original profiles."
          );
        }
        setProfiles(realProfiles);
      })
      .catch((err) => {
        console.error("Community load error:", err);
        setError("Failed to load community profiles. Try again later.");
        setProfiles([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveFollowing(following);
  }, [following]);

  // filter + sort + paginate
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = profiles.filter((p) => {
      if (!q) return true;
      return (
        p.displayName.toLowerCase().includes(q) ||
        (p.bio || "").toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });

    if (sortBy === "calm") {
      list = list.sort((a, b) => (b.baselineMetrics?.calm || 0) - (a.baselineMetrics?.calm || 0));
    } else if (sortBy === "recent") {
      list = list.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
    } else {
      // relevance fallback: keep as-is (mock data order)
    }

    return list;
  }, [profiles, query, sortBy]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const toggleFollow = (id) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFollowing(next);
      return next;
    });
  };

  const openProfile = (p) => {
    setViewModal(p);
  };

  const clearFilters = () => {
    setQuery("");
    setSortBy("relevance");
    setPage(1);
    setError("");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-gray-100">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <Header />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold">Community</h2>
              <p className="text-sm text-gray-400">Browse public profiles — only verified/original profiles are shown.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-full px-3 py-2 w-full md:w-96">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search names, bio, tags..."
                  className="bg-transparent outline-none placeholder:text-gray-500 text-sm flex-1"
                  aria-label="Search community"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                    className="p-1 rounded hover:bg-gray-700"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    aria-label="Sort profiles"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="calm">Calm score</option>
                    <option value="recent">Newest</option>
                  </select>
                </div>

                <button
                  onClick={clearFilters}
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700"
                >
                  <Filter className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-red-900/40 p-4 rounded-lg text-sm text-red-200">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((p) => (
                  <motion.article
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}
                    className="bg-gradient-to-br from-gray-850 to-gray-900 border border-gray-800 rounded-2xl p-4"
                    aria-labelledby={`profile-${p.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <img src={p.avatarUrl} alt={p.displayName} className="w-14 h-14 rounded-full object-cover ring-1 ring-gray-700" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div id={`profile-${p.id}`} className="font-semibold text-white truncate">{p.displayName}</div>
                            <div className="text-xs text-gray-400 mt-0.5 truncate">{p.bio}</div>
                          </div>

                          <div className="flex flex-col items-end">
                            <div className="text-xs text-gray-400">Calm</div>
                            <div className="font-medium text-green-300">{p.baselineMetrics?.calm ?? "—"}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {(p.tags || []).slice(0, 4).map((t) => (
                            <span key={t} className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-300">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openProfile(p)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700"
                          aria-label={`View ${p.displayName}`}
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button
                          onClick={() => navigate(`/profile/${p.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700"
                        >
                          <Users className="w-4 h-4" /> Profile
                        </button>
                      </div>

                      <div>
                        <button
                          onClick={() => toggleFollow(p.id)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            following.has(p.id)
                              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-black"
                              : "bg-purple-600 text-white"
                          }`}
                          aria-pressed={following.has(p.id)}
                        >
                          {following.has(p.id) ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          {following.has(p.id) ? "Following" : "Follow"}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}

                {visible.length === 0 && (
                  <div className="col-span-full text-center text-gray-400 py-12">
                    No community profiles available. If you believe this is wrong, ensure the backend returns verified/original profiles.
                  </div>
                )}
              </div>

              {/* load more */}
              {filtered.length > visible.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setPage((s) => s + 1)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile modal */}
        <AnimatePresence>
          {viewModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setViewModal(null)} />

              <motion.div initial={{ y: 12 }} animate={{ y: 0 }} exit={{ y: 12 }} transition={{ duration: 0.18 }} className="relative z-10 max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                  <img src={viewModal.avatarUrl} alt={viewModal.displayName} className="w-20 h-20 rounded-full object-cover ring-1 ring-gray-700" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{viewModal.displayName}</h3>
                        <div className="text-sm text-gray-400">{viewModal.bio}</div>
                        <div className="mt-2 text-xs text-gray-400">Joined: {new Date(viewModal.joinedAt || Date.now()).toLocaleDateString()}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleFollow(viewModal.id)} className={`px-3 py-2 rounded-lg text-sm ${following.has(viewModal.id) ? "bg-green-400 text-black" : "bg-purple-600 text-white"}`}>
                          {following.has(viewModal.id) ? "Following" : "Follow"}
                        </button>
                        <button onClick={() => navigate(`/profile/${viewModal.id}`)} className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm">Open Profile</button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm text-gray-300 mb-1">About</h4>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{viewModal.longBio || viewModal.bio}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(viewModal.tags || []).map((t) => (
                          <span key={t} className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-300">{t}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-gray-400">Baseline metrics: Calm {viewModal.baselineMetrics?.calm ?? "—"} • Anxiety {viewModal.baselineMetrics?.anxiety ?? "—"}</div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setViewModal(null)} className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm">Close</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
