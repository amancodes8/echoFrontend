// src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpClient } from '../api/httpClient';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');

  // fetch profile data (current user or by id)
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const targetId = id || user?.profile?._id || user?.profile?.id;
        if (!targetId) {
          setError('No profile ID found.');
          setLoading(false);
          return;
        }

        const data = await httpClient.get(`/profile/${targetId}`);
        setProfile(data.profile || data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [id, user]);

  // fetch session history (if available in backend)
  useEffect(() => {
    const fetchSessions = async () => {
      if (!profile?.userId) return;
      try {
        const data = await httpClient.get(`/sessions/user/${profile.userId}`);
        setSessions(data?.sessions || []);
      } catch (err) {
        console.warn('No session data found or backend route not ready.');
        setSessions([]);
      }
    };

    if (profile?.userId) fetchSessions();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center">
        <p className="text-gray-700 mb-4">{error || 'Profile not found.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <Header />
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img
              src={profile.avatarUrl || '/default-avatar.png'}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover border border-gray-200"
            />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-purple-600">{profile.displayName}</h2>
              <p className="text-gray-600 mt-1">{profile.bio}</p>
              <p className="text-sm text-gray-500 mt-2">
                📍 {profile.location || 'Location not set'}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {profile.tags?.length > 0 ? (
                  profile.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">No tags yet</span>
                )}
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <p>
                  <strong>Baseline Metrics</strong> — Calm: {profile.baselineMetrics?.calm ?? 'N/A'} • Anxiety: {profile.baselineMetrics?.anxiety ?? 'N/A'} • Focus: {profile.baselineMetrics?.focus ?? 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-2">Recent Sessions</h3>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s._id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-purple-700">
                        {new Date(s.timestamp).toLocaleString()}
                      </span>
                      <span className="text-gray-600">
                        Mood: {s.mood || '—'}
                      </span>
                    </div>
                    {s.notes && (
                      <p className="text-gray-600 text-sm mt-1">{s.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3">
                No recorded sessions yet.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
