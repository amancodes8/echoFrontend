// src/components/ChatbotFloatingLocal.jsx
import React, { useState, useRef, useEffect } from "react";

const cannedReplies = [
  "Try a 4-4-4 breathing: inhale 4s, hold 4s, exhale 4s. Repeat 4 times.",
  "If you're feeling overwhelmed, try naming 5 things you can see, 4 you can touch, 3 you can hear — grounding helps.",
  "Regular small habits help: sleep schedule, short walks, and 10 minutes of focused breathing.",
];

function simpleResponder(text) {
  const t = text.toLowerCase();
  if (!t.trim()) return "Say a little about what's on your mind.";
  if (t.includes("suicide") || t.includes("kill myself") || t.includes("hurt myself")) {
    return "I'm really sorry. I can't provide emergency help. Please contact local emergency services or a crisis hotline now. If you're in India, consider contacting local helplines like Snehi, Kiran, or emergency services.";
  }
  if (t.includes("anx") || t.includes("panic") || t.includes("panic attack")) {
    return "If you're having a panic attack, try grounding and slow breathing. Box breathing: inhale 4s, hold 4s, exhale 4s. If you can, sit and focus on 3 things you see around you.";
  }
  if (t.includes("sleep") || t.includes("insomnia")) {
    return "Try a wind-down routine: avoid screens 30 mins before bed, dim lights, and try progressive muscle relaxation or a 10-minute guided breathing.";
  }
  if (t.includes("stress") || t.includes("work")) {
    return "Break tasks into small steps, try a 5-minute break every hour, and prioritize the top 1-2 tasks for the day.";
  }
  // otherwise random helpful tip
  return cannedReplies[Math.floor(Math.random() * cannedReplies.length)];
}

export default function ChatbotFloatingLocal() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi — I'm MindBot. I offer basic support and tips. I'm not a replacement for a professional." }]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const replyText = simpleResponder(userMsg.text);
      setMessages((m) => [...m, { role: "assistant", text: replyText }]);
      setLoading(false);
    }, 350); // small local delay for UX
  };

  return (
    <>
      <div className="fixed right-6 bottom-6 z-[1000]">
        <button onClick={() => setOpen((o) => !o)} title="Mental health assistant" className="w-14 h-14 rounded-full bg-indigo-600 shadow-lg flex items-center justify-center text-white text-xl font-bold">
          💬
        </button>
      </div>

      {open && (
        <div className="fixed right-6 bottom-24 z-[1000] w-[320px] md:w-[380px] rounded-2xl bg-white/5 backdrop-blur p-3 border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">MindBot — Local Support</div>
            <div className="text-xs text-gray-400">No data leaves your browser</div>
          </div>

          <div ref={listRef} className="h-48 overflow-auto space-y-2 mb-2 p-2 bg-black/10 rounded">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded ${m.role === "user" ? "bg-indigo-600 text-white self-end" : "bg-gray-800 text-gray-100"}`}>
                <div className="text-xs">{m.role === "user" ? "You" : "MindBot"}</div>
                <div className="text-sm">{m.text}</div>
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400">Typing…</div>}
          </div>

          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 px-3 py-2 rounded bg-gray-900 text-white text-sm" placeholder="I feel..." onKeyDown={(e)=>{ if(e.key==='Enter') send(); }} />
            <button onClick={send} disabled={loading} className="px-3 py-2 rounded bg-indigo-500 text-black font-semibold">{loading ? "…" : "Send"}</button>
          </div>

          <div className="text-xs text-gray-400 mt-2 text-left">If you are in crisis, please contact local emergency services or a crisis hotline immediately.</div>
        </div>
      )}
    </>
  );
}
