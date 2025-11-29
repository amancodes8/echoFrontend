// src/components/Sidebar.jsx
import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Repeat,
  Book,
  Settings,
  Zap,
  HeartPulse,
  BookOpen,
  Users,
  Play,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  X,
  Menu,
  Video,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useToasts } from "../contexts/ToastContext";

const STORAGE_KEY = "mindecho_sidebar_collapsed_v1";
const VideoCallDock = lazy(() => import("./VideoCallDock").catch(() => ({ default: () => null })));

function Tooltip({ label }) {
  return (
    <span
      role="tooltip"
      aria-hidden="true"
      className="absolute z-50 pointer-events-none whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-100 shadow-lg -translate-y-1/2 left-full ml-3 top-1/2"
    >
      {label}
    </span>
  );
}

// Small responsive bottom nav for mobile (keeps main nav reachable without opening drawer)
function MobileBottomNav({ nav, currentPath, onOpenDrawer }) {
  return (
    <nav className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-3xl">
      <div className="backdrop-blur-sm bg-gray-900/70 border border-gray-800 rounded-2xl shadow-lg p-2 flex justify-between">
        {nav.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.to || currentPath.startsWith(item.to + "/");
          if (item.to.startsWith("/profile") && !item.showForGuest) return null; // handled by parent map
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 text-center py-2 rounded-md transition-colors text-xs ${
                active ? "text-white" : "text-gray-300"
              }`}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                /* close drawer will happen naturally when route changes */
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon className="w-5 h-5" />
                <span className="truncate text-[11px]">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <button
          onClick={onOpenDrawer}
          aria-label="Open menu"
          className="ml-2 inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-800/30"
        >
          <Menu className="w-5 h-5 text-gray-200" />
        </button>
      </div>
    </nav>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { addToast } = useToasts();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    window.showMindEchoMobileMenu = () => setMobileOpen(true);
    return () => {
      try {
        delete window.showMindEchoMobileMenu;
      } catch {}
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => {
      try {
        document.body.style.overflow = prev || "";
      } catch {}
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen && drawerRef.current) {
      setTimeout(() => drawerRef.current.focus(), 80);
    }
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/call", label: "Therapy Session", icon: Video },
    { to: "/mood", label: "My Mood", icon: HeartPulse },
    { to: "/meditation", label: "Meditation", icon: Play },
    { to: "/journal", label: "My Journal", icon: BookOpen },
    { to: "/community", label: "Community", icon: Users },
    { to: "/history", label: "History", icon: Repeat },
    { to: `/profile/${user?.profile?.id || ""}`, label: "Profile", icon: Book, showForGuest: !!user?.profile },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to) => {
    if (!to) return false;
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  const handleLogout = async () => {
    try {
      await logout();
      addToast({ title: "Signed out", description: "You have been logged out.", tone: "success" });
      navigate("/login");
    } catch (err) {
      addToast({ title: "Logout failed", description: err?.message || "Try again", tone: "error" });
    }
  };

  const itemVariants = {
    idle: { opacity: 1, y: 0 },
    hover: { scale: 1.04, y: -2 },
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b bg-gray-900 border-gray-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 rounded hover:bg-gray-800"
          >
            <Menu className="text-gray-200 w-5 h-5" />
          </button>
          <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="font-semibold text-white truncate">MindEcho</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile/' + (user?.profile?.id || ''))}
            aria-label="Open profile"
            className="p-2 rounded hover:bg-gray-800/40"
          >
            <img src={user?.profile?.avatarUrl || `https://placehold.co/40/444/CCC?text=?`} alt="avatar" className="w-8 h-8 rounded-full border" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-gray-900 text-gray-300 border-r border-gray-800 shadow-xl transition-all duration-200 ${
          collapsed ? "w-20" : "w-72"
        }`}
        aria-label="Main navigation"
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-lg font-bold text-white">MindEcho</div>
                <div className="text-xs text-gray-400">Wellbeing companion</div>
              </div>
            )}
          </div>

          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((s) => !s)}
            className="p-2 rounded hover:bg-gray-800/40 focus:outline-none focus:ring-2 focus:ring-purple-600"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronsRight className="w-5 h-5 text-gray-300" /> : <ChevronsLeft className="w-5 h-5 text-gray-300" />}
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-auto py-3 px-2">
          <ul className="space-y-1">
            {nav.map((item) => {
              if (item.to.startsWith("/profile") && !user?.profile) return null;
              const active = isActive(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to} className="relative">
                  <motion.div
                    initial="idle"
                    whileHover="hover"
                    variants={itemVariants}
                    onMouseEnter={() => setHoveredItem(item.label)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      to={item.to}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                        active
                          ? "bg-gradient-to-r from-purple-700/20 to-indigo-700/10 text-white"
                          : "text-gray-300 hover:bg-gray-800/40 hover:text-white"
                      } ${collapsed ? "justify-center" : ""}`}
                      aria-current={active ? "page" : undefined}
                      onFocus={() => setHoveredItem(item.label)}
                      onBlur={() => setHoveredItem(null)}
                    >
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r transition-all ${
                          active ? "bg-gradient-to-b from-purple-400 to-indigo-400 shadow-[0_0_12px] from-purple-400/40" : "opacity-0"
                        }`}
                        aria-hidden
                      />

                      <Icon className="w-5 h-5 z-10" />
                      {!collapsed && <span className="truncate z-10">{item.label}</span>}

                      {collapsed && hoveredItem === item.label && (
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2">
                          <Tooltip label={item.label} />
                        </div>
                      )}
                    </Link>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* footer */}
        <div className="p-3 border-t border-gray-800">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <img src={user?.profile?.avatarUrl || `https://placehold.co/40/444/CCC?text=?`} alt="avatar" className="w-9 h-9 rounded-full border" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-100 truncate">{user?.profile?.displayName || user?.name || "Guest"}</div>
                <div className="text-xs text-gray-400 truncate">{user?.email || ""}</div>
              </div>
            )}
            <button onClick={handleLogout} title="Log out" className="p-2 rounded hover:bg-red-600/10" aria-label="Log out">
              <LogOut className="w-5 h-5 text-gray-300 hover:text-red-400" />
            </button>
          </div>

          {/* Video call dock */}
          <div className="mt-3">
            <Suspense fallback={<div className="text-sm text-gray-400 p-2">Loading call...</div>}>
              {/* <VideoCallDock /> */}
            </Suspense>
          </div>

          {/* compact quick actions shown only when expanded */}
          {!collapsed && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  addToast({ title: "Profile", description: "Opening profile...", tone: "info" });
                  navigate(`/profile/${user?.profile?.id || ""}`);
                }}
                className="p-2 rounded-md hover:bg-gray-800/30 focus:outline-none"
                title="Profile"
              >
                <Book className="w-4 h-4 text-gray-300" />
              </button>
              <button onClick={handleLogout} className="p-2 rounded-md hover:bg-red-800/10 text-red-400" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden" role="dialog" aria-modal="true" aria-label="Main navigation">
            {/* overlay */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black" onClick={() => setMobileOpen(false)} />

            <motion.div
              ref={drawerRef}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-full sm:w-80 max-w-[420px] bg-gray-900 border-r border-gray-800 shadow-2xl focus:outline-none"
              tabIndex={-1}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-lg font-bold text-white truncate">MindEcho</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 rounded hover:bg-gray-800">
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
              </div>

              <nav className="p-4 overflow-auto h-[calc(100vh-200px)]">
                <ul className="space-y-1">
                  {nav.map((item) => {
                    if (item.to.startsWith("/profile") && !user?.profile) return null;
                    const active = isActive(item.to);
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                            active ? "bg-purple-700/20 text-white" : "text-gray-300 hover:bg-gray-800"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-6 border-t border-gray-800 pt-4">
                  <div className="flex items-center gap-3 px-3">
                    <img src={user?.profile?.avatarUrl || `https://placehold.co/40/444/CCC?text=?`} alt="avatar" className="w-10 h-10 rounded-full" />
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{user?.profile?.displayName || user?.name || "Guest"}</div>
                      <div className="text-xs text-gray-400 truncate">{user?.email || ""}</div>
                    </div>
                  </div>

                  <div className="mt-4 px-3 space-y-2">
                    <button onClick={handleLogout} className="w-full px-3 py-2 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30">
                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Sign out
                      </div>
                    </button>

                  

            
                  </div>
                </div>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* helpful mobile bottom nav to increase discoverability */}
     </>
  );
}
