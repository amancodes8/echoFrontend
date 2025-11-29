// src/components/Header.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  LogOut,
  Menu as MenuIcon,
  Search as SearchIcon,
  ChevronDown,
  Settings,
  User,
  SunMoon,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useToasts } from "../contexts/ToastContext";

/** Utility: capitalize first letter of each word */
function capitalizeName(name = "") {
  if (!name) return "";
  return name
    .split(" ")
    .map((p) => (p ? `${p[0].toUpperCase()}${p.slice(1)}` : ""))
    .join(" ");
}

/**
 * Demo search index.
 * Replace this with your real list (from server or local app state).
 * Each item: { id, type, title, subtitle, url, tags }
 */
const SEARCH_INDEX = [
  { id: "ex-1", type: "Exercise", title: "4-4-4 Breathing", subtitle: "Short breathing exercise", url: "/exercises/breathing", tags: ["breath","calm"] },
  { id: "ex-2", type: "Exercise", title: "Micro Focus Drill", subtitle: "30s focus training", url: "/exercises/focus-drill", tags: ["focus","attention"] },
  { id: "sess-1", type: "Session", title: "Morning Reset", subtitle: "10-minute routine", url: "/sessions/morning-reset", tags: ["morning","energy"] },
  { id: "tip-1", type: "Tip", title: "Hydration Tip", subtitle: "Drink water to improve focus", url: "/tips/hydration", tags: ["health","focus"] },
  { id: "tip-2", type: "Tip", title: "Screen Breaks", subtitle: "Short breaks reduce strain", url: "/tips/screen-breaks", tags: ["productivity","rest"] },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { addToast } = useToasts();

  const openMobileMenu = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent("mobile-sidebar-toggle", { detail: true }));
      window.dispatchEvent(new CustomEvent("mobile-sidebar-open", { detail: true }));
      if (typeof window.showMindEchoMobileMenu === "function") window.showMindEchoMobileMenu();
    } catch (err) {
      console.error("[Header] failed to open mobile menu", err);
    }
  }, []);

  const triggerToast = (opts = {}) =>
    addToast({
      title: opts.title || "Tip",
      description: opts.description || "Quick actions are available in your profile menu.",
      tone: opts.tone || "info",
      duration: opts.duration ?? 2500,
    });

  const handleLogout = async () => {
    try {
      await logout();
      addToast({ title: "Signed out", description: "You have been logged out.", tone: "success" });
    } catch (err) {
      addToast({ title: "Logout failed", description: err?.message || "Try again", tone: "error" });
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointer = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  const runSearch = useCallback((q) => {
    const qtrim = (q || "").trim().toLowerCase();
    if (!qtrim) return [];
    const tokens = qtrim.split(/\s+/).filter(Boolean);
    const scored = SEARCH_INDEX.map((it) => {
      let score = 0;
      const hay = `${it.title} ${it.subtitle || ""} ${it.tags?.join(" ") || ""}`.toLowerCase();
      for (const t of tokens) {
        if (hay.includes(t)) score += 10;
      }
      for (const t of tokens) {
        if (it.title.toLowerCase().startsWith(t)) score += 4;
      }
      return { item: it, score };
    })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    return scored;
  }, []);

  // debounce search
  useEffect(() => {
    if (!query) {
      setResults([]);
      setShowResults(false);
      setHighlight(-1);
      return;
    }
    const t = setTimeout(() => {
      const r = runSearch(query);
      setResults(r);
      setShowResults(true);
      setHighlight(r.length ? 0 : -1);
    }, 160);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (!showResults) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(results.length - 1, h + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      } else if (e.key === "Enter") {
        if (highlight >= 0 && results[highlight]) {
          const sel = results[highlight];
          window.location.href = sel.url || "#";
          setShowResults(false);
        }
      } else if (e.key === "Escape") {
        setShowResults(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showResults, results, highlight]);

  // click outside closes results
  useEffect(() => {
    const onPointer = (e) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target) &&
        !searchRef.current?.contains(e.target)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const [unread, setUnread] = useState(2);
  const displayName = capitalizeName(user?.profile?.displayName || user?.name || "Guest");
  const avatarUrl = user?.profile?.avatarUrl || "/default-avatar.png";

  // slash focuses search
  useEffect(() => {
    const onSlash = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  const selectResult = (idx) => {
    const sel = results[idx];
    if (!sel) return;
    window.location.href = sel.url;
    setShowResults(false);
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 md:p-6 mb-6   text-gray-200">
      {/* LEFT */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={openMobileMenu}
          className="p-2 rounded-md hover:bg-gray-800 md:hidden focus:outline-none focus:ring-2 focus:ring-purple-600"
        >
          <MenuIcon className="w-5 h-5 text-gray-200" />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-semibold text-white truncate">
            Hello, <span className="text-purple-400">{displayName}</span> 👋
          </h1>
          <p className="text-xs md:text-sm text-gray-400">
            Your mind’s reflection — private & actionable.
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex-1 max-w-2xl w-full relative">
        <div className="hidden md:flex items-center bg-gray-800 border border-gray-700 rounded-full px-3 py-2">
          <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises, sessions, tips... (/ to focus)"
            className="flex-1 bg-transparent text-sm outline-none text-gray-200"
            onFocus={() => results.length && setShowResults(true)}
          />
          <button
            onClick={() => {
              if (!query) return triggerToast({ description: "Type something to search" });
              const r = runSearch(query);
              setResults(r);
              setShowResults(true);
              setHighlight(r.length ? 0 : -1);
            }}
            className="ml-3 px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm"
          >
            Search
          </button>
        </div>

        {/* SEARCH RESULTS */}
        <AnimatePresence>
          {showResults && (
            <motion.ul
              ref={resultsRef}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute left-0 right-0 mt-2 z-50 max-h-72 overflow-auto bg-gray-900 border border-gray-800 rounded-xl shadow-xl"
            >
              {results.length === 0 ? (
                <li className="px-4 py-3 text-xs text-gray-400">No results.</li>
              ) : (
                results.map((r, i) => (
                  <li
                    key={r.id}
                    onClick={() => selectResult(i)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800 ${
                      highlight === i ? "bg-gray-800" : ""
                    }`}
                  >
                    <div className="w-9 h-9 bg-gray-700 rounded-md flex items-center justify-center text-xs font-semibold">
                      {r.type[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-gray-100">{r.title}</div>
                      <div className="text-xs text-gray-400">{r.subtitle}</div>
                    </div>
                  </li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-3">

        {/* TALK TO AI BUTTON */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            window.location.href = "http://127.0.0.1:5500/public/index.html";
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 
                     hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium
                     shadow-md hover:shadow-lg focus:outline-none focus:ring-2 
                     focus:ring-purple-600 flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Talk to AI
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setUnread(0)}
          className="p-2 rounded-full hover:bg-gray-800 relative"
        >
          <Bell className="w-5 h-5 text-gray-200" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs px-1.5 rounded-full">
              {unread}
            </span>
          )}
        </motion.button>

        {/* Settings */}
        <motion.button
          whileHover={{ y: -2 }}
          onClick={() => triggerToast({ description: "Open settings from profile menu." })}
          className="p-2 rounded-full hover:bg-gray-800"
        >
          <Settings className="w-5 h-5 text-gray-200" />
        </motion.button>

        {/* Theme */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => triggerToast({ title: "Theme", description: "Toggle theme (demo)." })}
          className="p-2 rounded-full hover:bg-gray-800"
        >
          <SunMoon className="w-5 h-5 text-gray-200" />
        </motion.button>

        {/* Profile Menu */}
        <div className="relative" ref={menuRef}>
          <motion.button
            onClick={() => setMenuOpen((s) => !s)}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-3 py-1 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 shadow-sm"
          >
            <div className="relative">
              <img src={avatarUrl} className="w-10 h-10 rounded-full border-2 border-gray-700" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-gray-900" />
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-sm text-gray-100 font-medium">{displayName.split(" ")[0]}</span>
              <span className="text-xs text-gray-400">Profile</span>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg py-2"
              >
                <li>
                  <button
                    onClick={() => (window.location.href = `/profile/${user?.profile?.id || ""}`)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex gap-2"
                  >
                    <User className="w-4 h-4 text-gray-400" /> Profile
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => (window.location.href = "/settings")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex gap-2"
                  >
                    <Settings className="w-4 h-4 text-gray-400" /> Settings
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex gap-2 text-red-400"
                  >
                    <LogOut className="w-4 h-4 text-red-500" /> Sign out
                  </button>
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
