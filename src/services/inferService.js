// src/services/inferService.js
import axios from '../api/axiosInstance';

/**
 * infer({ imageFile, audioFile, eegFile, userId, onUploadProgress })
 * - returns server response data (JSON)
 */
export async function infer({ imageFile, audioFile, eegFile, userId = 'guest', onUploadProgress }) {
  const fd = new FormData();
  if (imageFile) fd.append('image', imageFile);
  if (audioFile) fd.append('audio', audioFile);
  if (eegFile) fd.append('eeg', eegFile);
  fd.append('user_id', userId);

  const res = await axios.post('/infer', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (ev) => {
      if (typeof onUploadProgress === 'function' && ev.total) {
        const pct = Math.round((ev.loaded * 100) / ev.total);
        onUploadProgress(pct);
      }
    },
  });

  return res.data;
}

/**
 * sendFeedback({ userId, exerciseId, rating, comment })
 */
export async function sendFeedback({ userId = 'guest', exerciseId, rating, comment }) {
  const fd = new FormData();
  fd.append('user_id', userId);
  fd.append('exercise_id', exerciseId);
  fd.append('rating', String(rating));
  if (comment) fd.append('comment', comment);

  const res = await axios.post('/feedback', fd);
  return res.data;
}

// default export for convenience (optional)
export default { infer, sendFeedback };
