// src/api/mockApi.js
// A friendly mock API for frontend development. Includes an event emitter
// and `pushLiveSignal` for simulating live sensor events.

const MOCK_DB = {
  users: [
    {
      id: 'u1',
      email: 'sarah@example.com',
      passwordHash: 'hashed_password',
      name: 'Sarah Connor',
      consent: { neurofeedback: true, camera: true, audio: true },
    },
  ],
  profiles: [
    {
      id: 'p1',
      userId: 'u1',
      displayName: 'Sarah',
      bio: 'Just trying to be more mindful.',
      location: 'San Francisco, CA',
      avatarUrl: `https://placehold.co/100x100/A78BFA/FFFFFF?text=SC`,
      tags: ['Mindfulness', 'Music'],
      baselineMetrics: { calm: 0.6, anxiety: 0.3, focus: 0.7 },
    },
  ],
  sessions: [
    {
      id: 's1',
      userId: 'u1',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      type: 'Breathing Exercise',
      duration: 300,
      startEmotion: 'anxious',
      endEmotion: 'calm',
      summary: 'Felt better after breathing.',
    },
  ],
};

// Simple event emitter for frontend dev (used for live signals)
function createEmitter() {
  const callbacks = {};
  return {
    on(event, cb) {
      if (!callbacks[event]) callbacks[event] = [];
      callbacks[event].push(cb);
      return () => {
        callbacks[event] = callbacks[event].filter((c) => c !== cb);
      };
    },
    off(event, cb) {
      if (!callbacks[event]) return;
      callbacks[event] = callbacks[event].filter((c) => c !== cb);
    },
    emit(event, data) {
      if (!callbacks[event]) return;
      callbacks[event].forEach((cb) => {
        try { cb(data); } catch (e) { console.error('mockApi emitter cb error', e); }
      });
    },
  };
}

const emitter = createEmitter();

const mockApi = {
  // --- auth ---
  login(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = MOCK_DB.users.find((u) => u.email === email);
        if (user && password === 'password') {
          const profile = MOCK_DB.profiles.find((p) => p.userId === user.id);
          resolve({ ...user, profile });
        } else {
          reject(new Error('Invalid email or password. (Hint: use "password")'));
        }
      }, 350);
    });
  },

  register(name, email, password, consent = { neurofeedback: true, camera: true, audio: true }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (MOCK_DB.users.find((u) => u.email === email)) {
          return reject(new Error('Email already in use.'));
        }
        const newId = `u${MOCK_DB.users.length + 1}`;
        const user = { id: newId, email, passwordHash: 'hashed_password', name, consent };
        MOCK_DB.users.push(user);
        const profile = {
          id: `p${MOCK_DB.profiles.length + 1}`,
          userId: newId,
          displayName: name.split(' ')[0],
          bio: '',
          location: '',
          avatarUrl: `https://placehold.co/100x100/A78BFA/FFFFFF?text=${name.charAt(0)}`,
          tags: [],
          baselineMetrics: { calm: 0.5, anxiety: 0.5, focus: 0.5 },
        };
        MOCK_DB.profiles.push(profile);
        resolve({ ...user, profile });
      }, 450);
    });
  },

  logout() {
    return new Promise((resolve) => setTimeout(resolve, 200));
  },

  getMe(userId) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const u = MOCK_DB.users.find((x) => x.id === userId);
        if (!u) return reject(new Error('User not found.'));
        const profile = MOCK_DB.profiles.find((p) => p.userId === u.id);
        resolve({ ...u, profile });
      }, 200);
    });
  },

  getProfiles() {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_DB.profiles.slice()), 250));
  },

  getProfile(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const p = MOCK_DB.profiles.find((x) => x.id === id);
        if (!p) return reject(new Error('Profile not found.'));
        resolve(p);
      }, 250);
    });
  },

  updateProfile(id, data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = MOCK_DB.profiles.findIndex((p) => p.id === id);
        if (idx === -1) return reject(new Error('Profile not found.'));
        MOCK_DB.profiles[idx] = { ...MOCK_DB.profiles[idx], ...data };
        resolve(MOCK_DB.profiles[idx]);
      }, 300);
    });
  },

  updateConsent(userId, consent) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const u = MOCK_DB.users.find((x) => x.id === userId);
        if (!u) return reject(new Error('User not found.'));
        u.consent = { ...u.consent, ...consent };
        resolve(u);
      }, 300);
    });
  },

  getHistory(userId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_DB.sessions.filter((s) => s.userId === userId));
      }, 300);
    });
  },

  exportData(userId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = MOCK_DB.users.find((u) => u.id === userId);
        const profile = MOCK_DB.profiles.find((p) => p.userId === userId);
        const sessions = MOCK_DB.sessions.filter((s) => s.userId === userId);
        resolve({ user, profile, sessions });
      }, 400);
    });
  },

  deleteData(userId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        MOCK_DB.users = MOCK_DB.users.filter((u) => u.id !== userId);
        MOCK_DB.profiles = MOCK_DB.profiles.filter((p) => p.userId !== userId);
        MOCK_DB.sessions = MOCK_DB.sessions.filter((s) => s.userId !== userId);
        resolve({ message: 'User data deleted.' });
      }, 500);
    });
  },

  // --- Event emitter API ---
  on(event, cb) {
    return emitter.on(event, cb);
  },

  off(event, cb) {
    return emitter.off(event, cb);
  },

  /**
   * pushLiveSignal
   * - Used in frontend dev to simulate receiving sensor signals.
   * - Example payload:
   *    { neuro: { alpha: 60, beta: 30 }, emotion: { smile: 0.2, frown: 0.8 }, acoustic: { pitch: 160, variance: 2 } }
   *
   * Emits 'signals' event with a timestamp and the payload.
   */
  pushLiveSignal(payload) {
    const ts = new Date().toISOString();
    const envelope = { timestamp: ts, ...payload };
    emitter.emit('signals', envelope);
    return envelope;
  },

  // small helper to generate semi-random signals for testing
  startAutoSignals(intervalMs = 1500) {
    if (this._autoInterval) return;
    this._autoInterval = setInterval(() => {
      const baseAnxiety = Math.random();
      const alpha = Math.round((1 - baseAnxiety) * 70 + Math.random() * 30);
      const beta = Math.round(baseAnxiety * 70 + Math.random() * 30);
      const smile = Math.max(0, Math.min(1, (1 - baseAnxiety) * 0.6 + Math.random() * 0.4));
      const frown = Math.max(0, Math.min(1, baseAnxiety * 0.6 + Math.random() * 0.4));
      const pitch = (100 + baseAnxiety * 100 + (Math.random() - 0.5) * 20).toFixed(2);
      const variance = (baseAnxiety * 5 + Math.random()).toFixed(2);

      this.pushLiveSignal({
        neuro: { alpha: alpha.toString(), beta: beta.toString() },
        emotion: { smile: smile.toFixed(3), frown: frown.toFixed(3), neutral: (Math.random() * 0.5).toFixed(3) },
        acoustic: { pitch: String(pitch), variance: String(variance) },
      });
    }, intervalMs);
  },

  stopAutoSignals() {
    if (this._autoInterval) {
      clearInterval(this._autoInterval);
      this._autoInterval = null;
    }
  },
};

export default mockApi;
