// src/pages/VideoCall.jsx
import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DailyGoalBar from '../components/DailyGoalBar';
import { Mic, Video, PhoneOff, ScreenShare } from 'lucide-react';

// IMPORTANT: update this to your token-server URL if different
const TOKEN_SERVER = process.env.REACT_APP_TOKEN_SERVER_URL || 'http://localhost:4000';

function useResponsiveGrid(count) {
  // compute CSS classes for responsive columns
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
}

export default function VideoCall() {
  const [joined, setJoined] = useState(false);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState([]); // {uid, videoTrack?, audioTrack?, playing?}
  const [appId, setAppId] = useState('');
  const [channel, setChannel] = useState('test-room');
  const [token, setToken] = useState('');
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);

  // UI friendly list of remote users (map uid -> tracks)
  const participantsRef = useRef({});
  participantsRef.current = participants.reduce((acc, p) => { acc[p.uid] = p; return acc; }, {});

  // fetch token from server
  const fetchToken = async (ch, uid = 0) => {
    const res = await fetch(`${TOKEN_SERVER}/token?channel=${encodeURIComponent(ch)}&uid=${uid}`);
    if (!res.ok) throw new Error('Failed to fetch token');
    return await res.json(); // { token, appId, uid }
  };

  // create DOM container for a user video (uid)
  function attachVideoToContainer(track, containerId) {
    try {
      const el = document.getElementById(containerId);
      if (!el) return;
      // clear before play
      el.innerHTML = '';
      track.play(el);
    } catch (err) {
      console.warn('attachVideo error', err);
    }
  }

  // join channel
  const join = async () => {
    if (joined) return;
    try {
      const tkData = await fetchToken(channel);
      setAppId(tkData.appId || '');
      setToken(tkData.token || '');

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // setup event listeners BEFORE join
      client.on('user-published', async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            const remoteVideoTrack = user.videoTrack;
            const uid = user.uid.toString();
            // add participant (or update)
            setParticipants((prev) => {
              const exists = prev.find((p) => p.uid === uid);
              if (exists) {
                return prev.map((p) => (p.uid === uid ? { ...p, videoTrack: remoteVideoTrack } : p));
              }
              return [...prev, { uid, videoTrack: remoteVideoTrack, audioTrack: user.audioTrack }];
            });

            // play into container when ready
            setTimeout(() => attachVideoToContainer(remoteVideoTrack, `player-${uid}`), 100);
          }
          if (mediaType === 'audio') {
            const remoteAudioTrack = user.audioTrack;
            remoteAudioTrack?.play?.(); // plays in background
            setParticipants((prev) => {
              const uid = user.uid.toString();
              const exists = prev.find((p) => p.uid === uid);
              if (exists) {
                return prev.map((p) => (p.uid === uid ? { ...p, audioTrack: remoteAudioTrack } : p));
              }
              return [...prev, { uid, audioTrack: remoteAudioTrack }];
            });
          }
        } catch (err) {
          console.warn('user-published handler error', err);
        }
      });

      client.on('user-unpublished', (user, type) => {
        const uid = user.uid.toString();
        // remove tracks or mark as offline
        setParticipants((prev) =>
          prev.map((p) => (p.uid === uid ? { ...p, [type === 'video' ? 'videoTrack' : 'audioTrack']: null } : p))
        );
        // If user left entirely, remove after a short delay
        setTimeout(() => {
          setParticipants((prev) => prev.filter((p) => p.uid !== uid || (p.videoTrack || p.audioTrack)));
        }, 500);
      });

      // join channel with token
      const uid = await client.join(tkData.appId, channel, tkData.token, undefined);

      // create local tracks
      const [microphoneTrack, cameraTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p' }),
      ]);
      localAudioTrackRef.current = microphoneTrack;
      localVideoTrackRef.current = cameraTrack;

      // publish local tracks
      await client.publish([microphoneTrack, cameraTrack]);

      // display local video
      // make container and play
      setParticipants((prev) => {
        const localId = uid.toString();
        const exists = prev.find((p) => p.uid === localId);
        if (exists) return prev.map((p) => (p.uid === localId ? { ...p, videoTrack: cameraTrack, audioTrack: microphoneTrack, local: true } : p));
        return [{ uid: localId, videoTrack: cameraTrack, audioTrack: microphoneTrack, local: true }, ...prev];
      });

      setTimeout(() => attachVideoToContainer(cameraTrack, `player-${uid}`), 100);

      setJoined(true);
    } catch (err) {
      console.error('join error', err);
      alert('Join failed: ' + (err.message || err));
    }
  };

  // leave channel & cleanup
  const leave = async () => {
    try {
      if (!clientRef.current) return;
      // close local tracks
      try {
        localAudioTrackRef.current?.close?.();
        localVideoTrackRef.current?.close?.();
      } catch {}
      // leave client
      await clientRef.current.leave();

      // cleanup UI
      setParticipants([]);
      clientRef.current = null;
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;
      setJoined(false);
    } catch (err) {
      console.warn('leave error', err);
    }
  };

  // toggle local audio
  const toggleAudio = async () => {
    try {
      if (!localAudioTrackRef.current) return;
      if (localAudioEnabled) {
        await localAudioTrackRef.current.setEnabled(false);
        setLocalAudioEnabled(false);
      } else {
        await localAudioTrackRef.current.setEnabled(true);
        setLocalAudioEnabled(true);
      }
    } catch (err) {
      console.warn('toggleAudio', err);
    }
  };

  // toggle local video
  const toggleVideo = async () => {
    try {
      if (!localVideoTrackRef.current) return;
      if (localVideoEnabled) {
        await localVideoTrackRef.current.setEnabled(false);
        setLocalVideoEnabled(false);
      } else {
        await localVideoTrackRef.current.setEnabled(true);
        setLocalVideoEnabled(true);
      }
    } catch (err) {
      console.warn('toggleVideo', err);
    }
  };

  // render responsive grid of videos
  const gridClass = useResponsiveGrid(participants.length || 1);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        leave();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <Header />

        <div className="max-w-6xl mx-auto">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-2xl font-semibold">Video Call</h2>

            <div className="flex items-center gap-2">
              <input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="px-3 py-2 rounded-md text-gray-900"
                placeholder="Channel name"
              />
              {!joined ? (
                <button onClick={join} className="px-4 py-2 bg-indigo-600 rounded-md text-white">Join</button>
              ) : (
                <button onClick={leave} className="px-4 py-2 bg-red-600 rounded-md text-white">Leave</button>
              )}
            </div>
          </div>

          {/* video grid */}
          <div className={`grid ${gridClass} gap-4`}>
            {participants.map((p) => (
              <div key={p.uid} className="relative bg-black rounded-lg overflow-hidden shadow-lg aspect-[4/3] flex items-center justify-center">
                <div id={`player-${p.uid}`} className="absolute inset-0 w-full h-full" />
                <div className="absolute left-2 top-2 bg-black/40 px-2 py-1 rounded text-xs flex items-center gap-2">
                  {p.local ? <span className="text-green-300">You</span> : <span>UID {p.uid}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* controls */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={toggleAudio} className="inline-flex items-center gap-2 px-3 py-2">
              <Mic className="w-4 h-4" /> {localAudioEnabled ? 'Mute' : 'Unmute'}
            </button>

            <button onClick={toggleVideo} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-md">
              <Video className="w-4 h-4" /> {localVideoEnabled ? 'Stop cam' : 'Start cam'}
            </button>

            <button onClick={() => alert('Screen share button - implement getDisplayMedia logic')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-md">
              <ScreenShare className="w-4 h-4" /> Share screen
            </button>
          </div>
        </div>
      </main>

      <DailyGoalBar />
    </div>
  );
}
