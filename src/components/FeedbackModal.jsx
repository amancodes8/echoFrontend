// src/components/FeedbackModal.jsx
import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { sendFeedback } from '../services/inferService';

export default function FeedbackModal({ open, onClose, userId, exercise }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating <= 0) {
      setError('Please select a rating.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await sendFeedback({
        userId,
        exerciseId: exercise?.id || 'unknown',
        rating,
        comment,
      });
      setSubmitting(false);
      onClose(true); // true → submitted
      setRating(0);
      setComment('');
    } catch (err) {
      setSubmitting(false);
      setError('Failed to submit feedback. Try again.');
      console.error('Feedback error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative">
        <button
          onClick={() => onClose(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-1">Feedback</h2>
        <p className="text-sm text-gray-500 mb-4">
          How helpful was this recommendation ({exercise?.title || 'exercise'})?
        </p>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-7 h-7 ${
                    s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          {/* Optional comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Optional comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Write something..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
          </div>

          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
