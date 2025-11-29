// src/hooks/useInfer.js
import { useState, useCallback } from 'react';
import * as inferService from '../services/inferService';

export default function useInfer() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const runInfer = useCallback(async (payload) => {
    setError(null);
    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      const data = await inferService.infer({ ...payload, onUploadProgress: setProgress });
      setResult(data);
      return data;
    } catch (err) {
      setError(err?.response?.data || { message: err.message || 'Inference failed' });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setLoading(false);
    setProgress(0);
    setError(null);
    setResult(null);
  };

  return { loading, progress, error, result, runInfer, reset };
}
