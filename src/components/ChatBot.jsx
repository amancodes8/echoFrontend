// src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from "react";

/**
 * ChatBot with Tone Switcher + Conversation → Action Triggers
 *
 * - Hold-to-talk (audio -> /api/voice -> transcript)
 * - Sends transcript as text-mode to /api/voice with { text, selectedMode }
 * - Tone selector (calm | motivate | grounding)
 * - detectTriggers shows breathing/journal/grounding UI automatically
 */

const BACKEND_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  "http://localhost:4000";
const VOICE_URL = `${BACKEND_BASE.replace(/\/$/, "")}/api/voice`;

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi — hold the mic and speak. I'll transcribe and reply." }]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState("calm"); // calm | motivate | grounding
  const [activeTool, setActiveTool] = useState(null); // 'breathing' | 'journaling' | 'grounding' | null
  const [breathStep, setBreathStep] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(new Audio());
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  // trigger detection (very simple heuristic — extend as needed)
  function detectTriggers(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    if (t.includes("overwhelm") || t.includes("overwhelmed") || t.includes("anxious") || t.includes("panic")) return "breathing";
    if (t.includes("can't focus") || t.includes("cannot focus") || t.includes("can't concentrate") || t.includes("distract")) return "grounding";
    if (t.includes("sad") || t.includes("low") || t.includes("down") || t.includes("depress")) return "journaling";
    return null;
  }

  // small helper: safe fetch JSON (reads text then parse)
  async function safeFetchJson(url, options) {
    const resp = await fetch(url, options);
    const text = await resp.text();
    if (!resp.ok) {
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) {}
      throw new Error(parsed?.error ?? parsed ?? `Voice API error ${resp.status}`);
    }
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { throw new Error("Invalid JSON from backend"); }
  }

  // convert base64 -> Blob
  const base64ToBlob = (b64, mime = "audio/ogg") => {
    const bytes = atob(b64);
    const len = bytes.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  // Start / stop recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        await handleAudioFlow(blob);
        try { stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
      };
      recorder.start();
      setRecording(true);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Microphone access denied. Allow mic and try again." }]);
    }
  };
  const stopRecording = () => {
    try { const r = mediaRecorderRef.current; if (r && r.state !== "inactive") r.stop(); } catch {}
    setRecording(false);
  };

  // Full flow: audio->transcript -> send transcript + mode -> reply
  async function handleAudioFlow(blob) {
    setLoading(true);
    try {
      // 1) send audio for transcription
      const form = new FormData();
      form.append("file", blob, "voice.webm");
      form.append("history", JSON.stringify(messages.slice(-10)));
      const transResp = await safeFetchJson(VOICE_URL, { method: "POST", body: form });

      if (!transResp?.success) {
        setMessages((m) => [...m, { role: "assistant", text: transResp?.error || "Could not transcribe audio." }]);
        setLoading(false);
        return;
      }

      const transcript = transResp.transcript || "";
      setMessages((m) => [...m, { role: "user", text: transcript }]);

      // detect triggers on user message
      const tool = detectTriggers(transcript);
      if (tool) setActiveTool(tool);

      // 2) send text-mode with selectedMode
      const jsonResp = await safeFetchJson(VOICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, history: messages.slice(-10), selectedMode }),
      });

      if (jsonResp?.success) {
        const reply = jsonResp.replyTextUserLanguage || jsonResp.replyText || "(no reply)";
        setMessages((m) => [...m, { role: "assistant", text: reply }]);

        // detect triggers in assistant reply (optional)
        const repTool = detectTriggers(reply);
        if (repTool) setActiveTool(repTool);

        // play audio if backend returns audioBase64
        if (jsonResp.audioBase64) {
          try {
            const blob = base64ToBlob(jsonResp.audioBase64);
            const url = URL.createObjectURL(blob);
            audioRef.current.src = url;
            audioRef.current.play().catch(() => {});
            audioRef.current.onended = () => URL.revokeObjectURL(url);
          } catch (e) {}
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", text: jsonResp?.error || "Assistant failed to reply." }]);
      }
    } catch (err) {
      console.error("handleAudioFlow error:", err);
      setMessages((m) => [...m, { role: "assistant", text: "Error processing audio." }]);
    } finally {
      setLoading(false);
    }
  }

  // typed send
  const sendText = async (txt) => {
    if (!txt || !txt.trim()) return;
    const text = txt.trim();
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    // detect triggers
    const tool = detectTriggers(text);
    if (tool) setActiveTool(tool);

    setLoading(true);
    try {
      const jsonResp = await safeFetchJson(VOICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, history: messages.slice(-10), selectedMode }),
      });

      if (jsonResp?.success) {
        const reply = jsonResp.replyTextUserLanguage || jsonResp.replyText || "(no reply)";
        setMessages((m) => [...m, { role: "assistant", text: reply }]);

        if (jsonResp.audioBase64) {
          try {
            const blob = base64ToBlob(jsonResp.audioBase64);
            const url = URL.createObjectURL(blob);
            audioRef.current.src = url;
            audioRef.current.play().catch(() => {});
            audioRef.current.onended = () => URL.revokeObjectURL(url);
          } catch (e) {}
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", text: jsonResp?.error || "Assistant error." }]);
      }
    } catch (e) {
      console.error("sendText error:", e);
      setMessages((m) => [...m, { role: "assistant", text: "Failed to reach assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  // Small UI components for tools
  const BreathingTool = () => (
    <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
      <div className="font-semibold">4-4-4 Breathing</div>
      <div className="text-sm text-gray-600 mt-1">Inhale 4s — hold 4s — exhale 4s. Repeat 4 times.</div>
      <div className="mt-2 flex gap-2">
        <button className="px-3 py-1 bg-teal-600 text-white rounded" onClick={() => {
          // very small interactive animation: step through 4 steps
          setBreathStep(1);
          setTimeout(() => setBreathStep(2), 4000);
          setTimeout(() => setBreathStep(3), 8000);
          setTimeout(() => setBreathStep(4), 12000);
          setTimeout(() => setBreathStep(0), 14000);
        }}>Start</button>
        <div className="text-sm text-gray-700">{breathStep ? `Step ${breathStep}/4` : "Ready"}</div>
      </div>
    </div>
  );

  const JournalingTool = () => (
    <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
      <div className="font-semibold">Quick Journaling</div>
      <div className="text-sm text-gray-600 mt-1">Prompt: What is one small thing that went well today? Write 2 sentences.</div>
      <button className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => {
        setMessages((m) => [...m, { role: "assistant", text: "Try writing two lines: 1) What went well; 2) One next small step." }]);
      }}>Use Prompt</button>
    </div>
  );

  const GroundingTool = () => (
    <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
      <div className="font-semibold">Grounding Tip</div>
      <div className="text-sm text-gray-600 mt-1">5-4-3-2-1: name 5 things you see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.</div>
      <button className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => {
        setMessages((m) => [...m, { role: "assistant", text: "Start: name 5 things you see around you." }]);
      }}>Start</button>
    </div>
  );

  return (
    <>
      {/* Floating button */}
      <div className="fixed right-6 bottom-6 z-[1000]">
        <button onClick={() => setOpen((o) => !o)} className="w-14 h-14 rounded-full bg-indigo-600 shadow-lg flex items-center justify-center text-white text-xl font-bold">
          💬
        </button>
      </div>

      {open && (
        <div className="fixed right-6 bottom-24 z-[1000] w-[340px] md:w-[420px] rounded-2xl bg-white/5 backdrop-blur p-3 border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold">MindBot — Voice & Text</div>
              <div className="text-xs text-gray-400">Tone: <span className="font-medium">{selectedMode}</span></div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tone switcher */}
              <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded text-sm">
                <option value="calm">🌿 Calm</option>
                <option value="motivate">⚡ Motivation</option>
                <option value="grounding">🧘 Grounding</option>
              </select>

              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded bg-gray-800/40">Close</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="h-44 overflow-auto space-y-2 mb-2 p-2 bg-black/10 rounded">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`p-2 rounded max-w-[85%] ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-100"}`}>
                  <div className="text-xs mb-1">{m.role === "user" ? "You" : "MindBot"}</div>
                  <div className="text-sm">{m.text}</div>
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400">Processing…</div>}
          </div>

          {/* Tool area (auto-show based on trigger) */}
          {activeTool && (
            <div className="mb-3">
              {activeTool === "breathing" && <BreathingTool />}
              {activeTool === "journaling" && <JournalingTool />}
              {activeTool === "grounding" && <GroundingTool />}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 items-center">
            <button
              onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
              onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              className={`px-3 py-2 rounded bg-indigo-500 text-black font-semibold ${recording ? "opacity-80" : ""}`}
            >
              {recording ? "Recording..." : "Hold to Talk"}
            </button>

            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') sendText(input); }} placeholder="Or type a message…" className="flex-1 px-3 py-2 rounded bg-gray-900 text-white text-sm" />

            <button onClick={() => sendText(input)} className="px-3 py-2 rounded bg-indigo-600 text-black font-semibold">{loading ? "…" : "Send"}</button>
          </div>

          <div className="text-xs text-gray-400 mt-2">Tip: pick a tone and the assistant will match it.</div>
        </div>
      )}
    </>
  );
}
