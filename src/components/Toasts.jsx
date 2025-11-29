// src/components/Toasts.jsx
import React from 'react';
import { X } from 'lucide-react';
import { useToasts } from '../contexts/ToastContext';

export default function Toasts() {
  const { toasts, removeToast } = useToasts();

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-3 max-w-xs">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`w-full rounded-lg shadow-lg p-3 border ${
            t.tone === 'success'
              ? 'bg-green-50 border-green-200'
              : t.tone === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">{t.title}</div>
              {t.description && <div className="text-xs text-gray-600 mt-1">{t.description}</div>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="ml-3 p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
