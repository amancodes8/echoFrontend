// src/components/VideoCallDock.jsx
import React, { useState, Suspense, lazy } from 'react';
import { Video, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy-loaded full call page / panel (keeps bundle small)
const VideoCallPro = lazy(() => import('../pages/VideoCallPro'));

export default function VideoCallDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Small dock button (meant to sit in sidebar footer) */}
      <div className="flex items-center justify-center p-2">
        <button
          onClick={(e) => {
            // Prevent the click from bubbling to parent elements (eg. sidebar toggle)
            e.stopPropagation();
            setOpen((s) => !s);
          }}
          aria-label="Open video call"
          title="Video call"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-shadow ${
            open ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white/5 text-gray-200 hover:bg-white/10'
          }`}
        >
          <Video className="w-5 h-5" />
        </button>
      </div>

      {/* Slide-over panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            // Prevent clicks inside the drawer from bubbling up
            onClick={(e) => e.stopPropagation()}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full z-[1200] w-full sm:w-[420px] md:w-[540px] bg-black/80 backdrop-blur-lg border-l border-gray-800 shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div
                className="flex items-center justify-between p-3 border-b border-gray-800"
                // also stop propagation on header area clicks (extra safety)
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Video Call</div>
                    <div className="text-xs text-gray-400">Open call dock</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                    }}
                    aria-label="Close video panel"
                    className="p-2 rounded hover:bg-white/5"
                  >
                    <X className="w-5 h-5 text-gray-200" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Loading call...
                    </div>
                  }
                >
                  {/* Render the full VideoCallPro page inside the drawer.
                      VideoCallPro should behave well when mounted inside a container.
                      If it manipulates document layout significantly, consider creating
                      a dedicated 'VideoCallMini' that uses the same Agora logic in compact mode. */}
                  <VideoCallPro />
                </Suspense>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
