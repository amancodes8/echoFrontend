// src/contexts/ToastContext.jsx
import React, { createContext, useContext, useCallback, useState } from 'react';
import { nanoid } from 'nanoid';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((opts) => {
    const id = nanoid();
    const toast = {
      id,
      title: opts.title || 'Notification',
      description: opts.description || '',
      tone: opts.tone || 'info', // 'info' | 'success' | 'error' | 'warn'
      duration: typeof opts.duration === 'number' ? opts.duration : 4500,
    };
    setToasts((t) => [toast, ...t]);

    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
}
