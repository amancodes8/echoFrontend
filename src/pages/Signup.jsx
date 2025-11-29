// src/pages/SignupPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { httpClient, setToken } from '../api/httpClient';

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth(); // update context after register
  const [step, setStep] = useState(1);

  // form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    displayName: '',
    bio: '',
    location: '',
    avatarUrl: '',
    tags: [],
    baselineMetrics: { calm: 0.5, anxiety: 0.5, focus: 0.5 },
    consent: { neurofeedback: true, camera: true, audio: true },
  });

  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Helpers
  const setField = (path, value) => {
    setForm(prev => {
      const next = { ...prev };
      if (path.includes('.')) {
        const [a, b] = path.split('.');
        next[a] = { ...next[a], [b]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const validateStep = (s = step) => {
    const e = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = 'Full name is required';
      if (!validateEmail(form.email)) e.email = 'Valid email is required';
      if (!form.password || form.password.length < 6) e.password = 'Password (min 6 chars) is required';
    } else if (s === 2) {
      if (!form.displayName.trim()) e.displayName = 'Display name is required';
      if (form.bio === undefined || form.bio.trim() === '') e.bio = 'A short bio is required';
      if (!form.location.trim()) e.location = 'Location is required';
      if (!Array.isArray(form.tags)) e.tags = 'Tags must be an array';
    } else if (s === 3) {
      const { calm, anxiety, focus } = form.baselineMetrics || {};
      if (typeof calm !== 'number' || calm < 0 || calm > 1) e.baselineMetrics = 'Calm must be between 0 and 1';
      if (typeof anxiety !== 'number' || anxiety < 0 || anxiety > 1) e.baselineMetrics = 'Anxiety must be between 0 and 1';
      if (typeof focus !== 'number' || focus < 0 || focus > 1) e.baselineMetrics = 'Focus must be between 0 and 1';
      const { neurofeedback, camera, audio } = form.consent || {};
      if (typeof neurofeedback !== 'boolean' || typeof camera !== 'boolean' || typeof audio !== 'boolean') {
        e.consent = 'Consent toggles are required';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep(s => Math.min(3, s + 1));
  };
  const back = () => {
    setErrors({});
    setStep(s => Math.max(1, s - 1));
  };

  // Tag handlers
  const addTag = (raw) => {
    const t = raw.trim();
    if (!t) return;
    if (!form.tags.includes(t)) {
      setField('tags', [...form.tags, t]);
    }
    setTagInput('');
    tagInputRef.current?.focus();
  };
  const removeTag = (t) => {
    setField('tags', form.tags.filter(x => x !== t));
  };
  const onTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' ) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '') {
      // remove last
      setField('tags', form.tags.slice(0, -1));
    }
  };

  // Submit (uses httpClient)
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    // validate all steps
    const ok1 = validateStep(1);
    const ok2 = validateStep(2);
    const ok3 = validateStep(3);
    if (!ok1 || !ok2 || !ok3) {
      setStep((!ok1) ? 1 : (!ok2) ? 2 : 3);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        displayName: form.displayName.trim(),
        bio: form.bio,
        location: form.location.trim(),
        tags: form.tags,
        baselineMetrics: {
          calm: Number(form.baselineMetrics.calm),
          anxiety: Number(form.baselineMetrics.anxiety),
          focus: Number(form.baselineMetrics.focus),
        },
        consent: {
          neurofeedback: Boolean(form.consent.neurofeedback),
          camera: Boolean(form.consent.camera),
          audio: Boolean(form.consent.audio),
        },
        avatarUrl: form.avatarUrl ? form.avatarUrl.trim() : undefined,
      };

      // call backend via httpClient. auth: false because registering
      const data = await httpClient.post('/auth/register', payload, { auth: false });

      // expected: { token, user: { id, email, name, profile } }
      if (!data) throw new Error('Empty response from server');

      if (data.token) {
        setToken(data.token);
      } else {
        // If backend returns user without token, still update context and navigate
        console.warn('No token returned from register response');
      }

      if (updateUser && data.user) {
        try { updateUser(data.user); } catch (e) { /* ignore */ }
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error', err);
      // if httpClient throws Error with message, show it; else generic
      setServerError(err?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          {/* Left promotional panel (optional) */}
          <div className="hidden md:block md:w-1/3 bg-purple-600 text-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-semibold">ME</div>
              <div>
                <h3 className="text-lg font-semibold">MindEcho</h3>
                <p className="text-xs opacity-80">Emotional mirror & adaptive guidance</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Create your account and provide a few details so MindEcho can personalize feedback and training.
            </p>
          </div>

          {/* Form */}
          <form className="w-full md:w-2/3 p-6 md:p-8" onSubmit={handleSubmit} noValidate>
            <h2 className="text-2xl font-bold mb-1">Create your account</h2>
            <p className="text-sm text-gray-500 mb-6">All fields are required to complete signup.</p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1,2,3].map(i => (
                <div key={i} className={`flex-1 text-center py-1 rounded-md ${step===i ? 'bg-purple-50 text-purple-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>
                  Step {i}
                </div>
              ))}
            </div>

            {/* Step 1: Account */}
            {step === 1 && (
              <div className="space-y-4">
                <label className="block">
                  <div className="text-sm font-medium text-gray-700">Full name</div>
                  <input value={form.name} onChange={e => setField('name', e.target.value)} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
                </label>

                <label className="block">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-700">Email</div>
                  </div>
                  <input value={form.email} onChange={e => setField('email', e.target.value)} type="email" className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  {errors.email && <div className="text-xs text-red-500 mt-1">{errors.email}</div>}
                </label>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Password</div>
                    <div className="text-xs text-gray-400">min 6 characters</div>
                  </div>
                  <div className="mt-1 relative">
                    <input value={form.password} onChange={e => setField('password', e.target.value)} type="password" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    <div className="absolute right-3 top-3 text-gray-400"><Lock className="w-4 h-4" /></div>
                  </div>
                  {errors.password && <div className="text-xs text-red-500 mt-1">{errors.password}</div>}
                </label>
              </div>
            )}

            {/* Step 2: Profile */}
            {step === 2 && (
              <div className="space-y-4">
                <label className="block">
                  <div className="text-sm font-medium text-gray-700">Display name</div>
                  <input value={form.displayName} onChange={e => setField('displayName', e.target.value)} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  {errors.displayName && <div className="text-xs text-red-500 mt-1">{errors.displayName}</div>}
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700">Short bio</div>
                  <textarea value={form.bio} onChange={e => setField('bio', e.target.value)} rows={3} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  {errors.bio && <div className="text-xs text-red-500 mt-1">{errors.bio}</div>}
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700">Location</div>
                  <input value={form.location} onChange={e => setField('location', e.target.value)} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  {errors.location && <div className="text-xs text-red-500 mt-1">{errors.location}</div>}
                </label>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Avatar URL (optional)</div>
                    <div className="text-xs text-gray-400">image link</div>
                  </div>
                  <input value={form.avatarUrl} onChange={e => setField('avatarUrl', e.target.value)} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-2">Tags (press Enter or comma to add)</div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <div key={tag} className="flex items-center bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                        <span className="mr-2">{tag}</span>
                        <button type="button" onClick={() => removeTag(tag)} className="p-1 rounded hover:bg-purple-100">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={onTagKeyDown}
                      onBlur={() => addTag(tagInput)}
                      placeholder="Add a tag..."
                      className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      style={{ minWidth: 140 }}
                    />
                  </div>
                  {errors.tags && <div className="text-xs text-red-500 mt-1">{errors.tags}</div>}
                </label>
              </div>
            )}

            {/* Step 3: Preferences */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Baseline metrics (0.0 — 1.0)</div>

                  <div className="space-y-3">
                    {['calm', 'anxiety', 'focus'].map((k) => (
                      <div key={k} className="flex items-center gap-4">
                        <div className="w-28 text-sm capitalize">{k}</div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={form.baselineMetrics[k]}
                          onChange={e => setField(`baselineMetrics.${k}`, parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <div className="w-12 text-right text-sm font-medium">{Number(form.baselineMetrics[k]).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  {errors.baselineMetrics && <div className="text-xs text-red-500 mt-1">{errors.baselineMetrics}</div>}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Sensor consent</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center p-3 border rounded-lg">
                      <input type="checkbox" checked={form.consent.neurofeedback} onChange={e => setField('consent.neurofeedback', e.target.checked)} />
                      <div className="ml-3">
                        <div className="text-sm font-semibold">Neurofeedback</div>
                        <div className="text-xs text-gray-500">EEG-derived focus/calm</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg">
                      <input type="checkbox" checked={form.consent.camera} onChange={e => setField('consent.camera', e.target.checked)} />
                      <div className="ml-3">
                        <div className="text-sm font-semibold">Micro-emotion (camera)</div>
                        <div className="text-xs text-gray-500">Facial micro-expression</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg">
                      <input type="checkbox" checked={form.consent.audio} onChange={e => setField('consent.audio', e.target.checked)} />
                      <div className="ml-3">
                        <div className="text-sm font-semibold">Acoustic sentiment</div>
                        <div className="text-xs text-gray-500">Voice pitch & variance</div>
                      </div>
                    </label>
                  </div>
                  {errors.consent && <div className="text-xs text-red-500 mt-1">{errors.consent}</div>}
                </div>
              </div>
            )}

            {/* Server error */}
            {serverError && <div className="mt-4 text-sm text-red-600">{serverError}</div>}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <div>
                {step > 1 && (
                  <button type="button" onClick={back} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step < 3 && (
                  <button type="button" onClick={next} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {step === 3 && (
                  <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md hover:opacity-95">
                    {loading ? 'Creating...' : 'Create account'}
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
