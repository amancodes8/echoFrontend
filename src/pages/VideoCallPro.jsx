// src/pages/VideoCallPro.jsx
import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Mic, MicOff, Video, VideoOff, ScreenShare, Star } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * VideoCallPro.jsx
 * - Uses backend token endpoint: /api/agora/token?channel=<channel>
 * - BACKEND is auto-detected from VITE_API_URL or defaults to http://localhost:4000
 *
 * Make sure your backend (index.js above) is running on that URL.
 */

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_PATHS = [
  (channel) => `${BACKEND.replace(/\/$/, '')}/api/agora/token?channel=${encodeURIComponent(channel)}`,
  (channel) => `${BACKEND.replace(/\/$/, '')}/token?channel=${encodeURIComponent(channel)}`,
  (channel) => `/api/agora/token?channel=${encodeURIComponent(channel)}`,
  (channel) => `/token?channel=${encodeURIComponent(channel)}`,
];

function useResponsiveCols(count) {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 4) return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4';
  if (count <= 6) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
}

export default function VideoCallPro() {
  const [channel, setChannel] = useState(() => `room-${new Date().toISOString().slice(11,19).replace(/:/g,'')}`);
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [spotlightUid, setSpotlightUid] = useState(null);
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localScreenTrackRef = useRef(null);

  const attachTrackTo = (track, containerId) => {
    try {
      const el = document.getElementById(containerId);
      if (!el) return;
      // clear previous children
      el.innerHTML = '';
      track.play(el);
    } catch (err) {
      console.warn('attach play failed', err);
    }
  };

  // try token endpoints in order until one returns JSON
  const fetchToken = async (ch) => {
    let lastErr = null;
    for (const pathFn of TOKEN_PATHS) {
      const url = pathFn(ch);
      try {
        const res = await fetch(url, { credentials: 'include' });
        const text = await res.text();
        // quick guard: if response looks like HTML, continue to next candidate
        if (!text) {
          lastErr = new Error(`Empty token response from ${url}`);
          continue;
        }
        if (text.trim().startsWith('<')) {
          lastErr = new Error(`Token endpoint returned HTML (not JSON). Preview: ${text.slice(0, 200)}`);
          continue;
        }
        // parse JSON
        const json = JSON.parse(text);
        if (!json || (!json.token && !json.appId)) {
          lastErr = new Error(`Token endpoint JSON invalid at ${url} — got ${JSON.stringify(json).slice(0,200)}`);
          continue;
        }
        return json;
      } catch (err) {
        lastErr = err;
        // try next
      }
    }
    // all attempts failed
    throw lastErr || new Error('No token endpoint succeeded');
  };

  // JOIN
  const handleJoin = async () => {
    if (joined) return;
    let client = null;
    try {
      const tokenRes = await fetchToken(channel);
      const appId = tokenRes.appId || tokenRes.appID || tokenRes.appid || tokenRes.app_id || tokenRes.appId;
      const token = tokenRes.token;
      if (!appId || !token) throw new Error('Token response missing appId or token');

      client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // events BEFORE join
      client.on('user-published', async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          const uidStr = String(user.uid);
          setParticipants((prev) => {
            const exists = prev.some((p) => p.uid === uidStr);
            if (!exists) return [{ uid: uidStr, local: false, hasVideo: mediaType === 'video', hasAudio: mediaType === 'audio' }, ...prev];
            return prev.map((p) => (p.uid === uidStr ? { ...p, [mediaType === 'video' ? 'hasVideo' : 'hasAudio']: true } : p));
          });

          if (mediaType === 'video' && user.videoTrack) {
            setTimeout(() => attachTrackTo(user.videoTrack, `player-${uidStr}`), 60);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        } catch (err) {
          console.warn('subscribe error', err);
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        const uidStr = String(user.uid);
        setParticipants((prev) =>
          prev.map((p) => (p.uid === uidStr ? { ...p, [mediaType === 'video' ? 'hasVideo' : 'hasAudio']: false } : p))
        );
        setTimeout(() => {
          setParticipants((prev) => prev.filter((p) => p.uid !== uidStr || p.hasVideo || p.hasAudio || p.local));
        }, 600);
      });

      client.on('user-left', (user) => {
        const uidStr = String(user.uid);
        setParticipants((prev) => prev.filter((p) => p.uid !== uidStr));
        if (spotlightUid === uidStr) setSpotlightUid(null);
      });

      // join (uid undefined -> SDK assigns)
      await client.join(appId, channel, token, undefined);

      // create local tracks
      const [microphoneTrack, cameraTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack({ encoderConfig: '480p' }),
      ]);
      localAudioTrackRef.current = microphoneTrack;
      localVideoTrackRef.current = cameraTrack;

      await client.publish([microphoneTrack, cameraTrack]);

      const localUid = String(client.uid || 'local');
      setParticipants((prev) => [{ uid: localUid, local: true, hasVideo: true, hasAudio: true }, ...prev]);
      setTimeout(() => attachTrackTo(cameraTrack, `player-${localUid}`), 80);

      setJoined(true);
    } catch (err) {
      console.error('Join failed', err);
      alert('Join failed: ' + (err.message || err));
      try { clientRef.current && clientRef.current.leave(); } catch (e) {}
    }
  };

  // LEAVE
  const handleLeave = async () => {
    try {
      if (!clientRef.current) return;
      const client = clientRef.current;
      try { localAudioTrackRef.current?.close?.(); } catch {}
      try { localVideoTrackRef.current?.close?.(); } catch {}
      try { localScreenTrackRef.current?.close?.(); } catch {}
      await client.leave();
    } catch (err) {
      console.warn('leave error', err);
    } finally {
      clientRef.current = null;
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;
      localScreenTrackRef.current = null;
      setParticipants([]);
      setJoined(false);
      setLocalAudioEnabled(true);
      setLocalVideoEnabled(true);
      setSharing(false);
      setSpotlightUid(null);
    }
  };

  const toggleAudio = async () => {
    try {
      if (!localAudioTrackRef.current) return;
      const enabled = !localAudioEnabled;
      await localAudioTrackRef.current.setEnabled(enabled);
      setLocalAudioEnabled(enabled);
    } catch (err) {
      console.warn('toggleAudio', err);
    }
  };

  const toggleVideo = async () => {
    try {
      if (!localVideoTrackRef.current) return;
      const enabled = !localVideoEnabled;
      await localVideoTrackRef.current.setEnabled(enabled);
      setLocalVideoEnabled(enabled);
    } catch (err) {
      console.warn('toggleVideo', err);
    }
  };

  const toggleScreenShare = async () => {
    if (!clientRef.current) return;
    try {
      if (!sharing) {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: '1080p' });
        localScreenTrackRef.current = screenTrack;
        await clientRef.current.unpublish([localVideoTrackRef.current]);
        await clientRef.current.publish([screenTrack]);
        const localUid = String(clientRef.current.uid || 'local');
        setTimeout(() => attachTrackTo(screenTrack, `player-${localUid}`), 100);
        setSharing(true);
      } else {
        await clientRef.current.unpublish([localScreenTrackRef.current]);
        localScreenTrackRef.current && localScreenTrackRef.current.close();
        localScreenTrackRef.current = null;
        await clientRef.current.publish([localVideoTrackRef.current]);
        const localUid = String(clientRef.current.uid || 'local');
        setTimeout(() => attachTrackTo(localVideoTrackRef.current, `player-${localUid}`), 100);
        setSharing(false);
      }
    } catch (err) {
      console.warn('screen share error', err);
      alert('Screen share failed: ' + (err && err.message ? err.message : err));
    }
  };

  const toggleSpotlight = (uid) => setSpotlightUid((prev) => (prev === uid ? null : uid));

  useEffect(() => {
    return () => {
      try { handleLeave(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colsClass = useResponsiveCols(participants.length || 1);

  const Tile = ({ p }) => {
    const uid = p.uid;
    const isSpot = spotlightUid && spotlightUid !== uid;
    return (
      <div
        key={uid}
        className={`relative bg-black rounded-lg overflow-hidden shadow-lg ${isSpot ? 'opacity-60' : 'opacity-100'} flex items-center justify-center`}
      >
        <div id={`player-${uid}`} className="absolute inset-0 w-full h-full" />
        <div className="absolute left-2 top-2 bg-black/40 px-2 py-1 rounded text-xs flex items-center gap-2">
          {p.local ? <span className="text-emerald-300">You</span> : <span>UID {uid}</span>}
          {p.hasAudio ? <span className="ml-1 text-xs text-emerald-300">●</span> : <span className="ml-1 text-xs text-red-400">○</span>}
        </div>

        <div className="absolute left-2 right-2 bottom-2 flex items-center justify-between text-xs">
          <div className="bg-black/40 rounded-md px-2 py-1">{p.hasVideo ? 'Video' : 'No Video'}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleSpotlight(uid)} title="Pin" className="p-1 rounded bg-black/40">
              <Star className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Header />
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Video Room</h2>
              <p className="text-sm text-gray-400">Secure video rooms via Agora.</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                aria-label="Channel name"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="px-3 py-2 rounded-md text-white bg-white/5 placeholder-gray-400"
              />
              {!joined ? (
                <button onClick={handleJoin} className="px-4 py-2 bg-indigo-600 rounded-md text-white shadow">Join</button>
              ) : (
                <button onClick={handleLeave} className="px-4 py-2 bg-red-600 rounded-md text-white shadow">Leave</button>
              )}

              <div className="flex items-center gap-2 ml-2">
                <button onClick={toggleAudio} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/5">
                  {localAudioEnabled ? <><Mic className="w-4 h-4" />Mute</> : <><MicOff className="w-4 h-4" />Unmute</>}
                </button>
                <button onClick={toggleVideo} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/5">
                  {localVideoEnabled ? <><Video className="w-4 h-4" />Stop</> : <><VideoOff className="w-4 h-4" />Start</>}
                </button>
                <button onClick={toggleScreenShare} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${sharing ? 'bg-yellow-600 text-black' : 'bg-white/5'}`}>
                  <ScreenShare className="w-4 h-4" />{sharing ? 'Sharing' : 'Share'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-3">
              <div className="rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 p-3 border border-gray-800">
                {spotlightUid ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden">
                    <div id={`player-${spotlightUid}`} className="w-full h-full" />
                  </div>
                ) : (
                  <div className={`grid ${colsClass} gap-3`}>
                    {participants.map((p) => (
                      <div key={p.uid} className="aspect-video rounded-lg overflow-hidden">
                        <Tile p={p} />
                      </div>
                    ))}
                    {participants.length === 0 && (
                      <div className="text-center text-sm text-gray-400 p-10">No participants. Join the room to start camera & mic.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-400">Channel: <span className="text-gray-100 font-medium">{channel}</span></div>
                <div className="text-sm text-gray-400">Participants: <span className="text-gray-100 font-medium">{participants.length}</span></div>
              </div>
            </div>

            <aside className="lg:col-span-1">
              <div className="rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Participants</div>
                  <div className="text-xs text-gray-400">{participants.length}</div>
                </div>

                <div className="max-h-64 overflow-auto space-y-2">
                  {participants.map((p) => (
                    <div key={p.uid} className="flex items-center justify-between bg-black/30 px-2 py-2 rounded-md">
                      <div className="truncate text-sm">
                        <div className="font-medium">{p.local ? 'You' : `UID ${p.uid}`}</div>
                        <div className="text-xs text-gray-400">{p.hasVideo ? 'Video' : 'No Video'} • {p.hasAudio ? 'Audio' : 'No Audio'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleSpotlight(p.uid)} className="p-1 rounded bg-white/5">
                          <Star className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {participants.length === 0 && <div className="text-sm text-gray-500">No participants yet.</div>}
                </div>

                <div className="pt-2">
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.href); alert('Room link copied'); }} className="w-full px-3 py-2 rounded-md bg-indigo-600 text-black font-semibold">Copy Link</button>
                </div>
              </div>

              <div className="mt-3 rounded-2xl p-3">
                <div className="text-sm font-semibold mb-2">Room Controls</div>
                <div className="flex gap-2">
                  <button onClick={() => setParticipants([])} className="flex-1 px-3 py-2 bg-white/5 rounded-md">Clear</button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    
    </div>
  );
}
