// src/components/Chatbot.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";

/*
 Improved Chatbot.jsx — stronger local responder to avoid static/canned replies.

 Key features:
  - Enhanced intent scoring (tokens + tags + recent-history boost)
  - Response assembly from clause banks (openers/core/followups/closers)
  - Contextual mention of recent user messages when useful
  - Synonym substitutions to paraphrase responses
  - Strict crisis detection (unchanged)
  - Keeps server (apiUrl) branch identical
*/

const FAQ_INDEX = [
  { q: "How can I calm anxiety quickly?", a: "Try box breathing: inhale 4s, hold 4s, exhale 4s. Ground yourself by noticing 5 things you see.", tags: ["anxiety","breathing","calm"] },
  { q: "How do I sleep better?", a: "Keep a consistent bedtime, avoid screens 60 minutes before bed, and try a short wind-down routine like reading.", tags: ["sleep","rest","bedtime"] },
  { q: "I'm overwhelmed", a: "Break tasks into tiny steps and try a 2-minute breathing break. Reach out to a friend if you can.", tags: ["overwhelm","coping","breakdown"] },
  { q: "Immediate help", a: "If you're in immediate danger, call your local emergency services. If thinking about self-harm, contact local crisis lines now.", tags: ["crisis","help","emergency"] },
];

function normalize(s = "") {
  return (s || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s = "") {
  return normalize(s).split(" ").filter(Boolean);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function containsAny(text = "", words = []) {
  const t = normalize(text);
  return words.some(w => t.includes(w));
}
function detectCrisis(text = "") {
  const words = ["suicide", "kill myself", "end my life", "hurt myself", "i want to die", "self harm", "self-harm", "i'll kill myself"];
  const t = normalize(text);
  return words.some(w => t.includes(w));
}
function tokenOverlapScore(qTokens = [], hay = "") {
  if (!qTokens.length) return 0;
  const haySet = new Set(tokens(hay));
  let matches = 0;
  for (const t of qTokens) if (haySet.has(t)) matches++;
  return matches / qTokens.length; // 0..1
}

// Synonym small map to vary phrasing
const SYNONYMS = {
  "try": ["try", "consider", "you might try", "experiment with"],
  "help": ["help", "support", "assist", "be useful"],
  "breathe": ["breathe", "take a breath", "do breathing"],
  "sleep": ["sleep", "rest", "get rest"],
  "calm": ["calm", "settle", "soothe"],
  "ground": ["ground", "anchor", "bring attention to the present"],
  "short": ["short", "brief", "quick"],
};

function paraphraseSentence(s) {
  // replace a few words with synonyms randomly
  return s.replace(/\b(try|help|breathe|sleep|calm|ground|short)\b/gi, (m) => {
    const key = m.toLowerCase();
    if (!SYNONYMS[key]) return m;
    const arr = SYNONYMS[key];
    return pick(arr);
  });
}

// find FAQ by fuzzy token overlap
function findFAQ(q) {
  const qtok = tokens(q);
  let best = null, bestScore = 0;
  for (const f of FAQ_INDEX) {
    const score = tokenOverlapScore(qtok, f.q + " " + (f.tags || []).join(" "));
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return bestScore >= 0.35 ? best : null;
}

/* Intent definitions with tags and clause banks for variability */
const INTENTS = {
  sleep: {
    tags: ["sleep","insomnia","tired","rest","bedtime","nap"],
    openers: [
      "Good place to start.",
      "That makes sense.",
      "Here's a suggestion.",
      "A few simple habits can help.",
    ],
    cores: [
      "Keep a consistent bedtime and wake time.",
      "Avoid screens and bright lights for 60 minutes before bed.",
      "Wind down with a low-stimulation routine (reading, warm shower, light stretching).",
      "Limit caffeine late in the day and avoid heavy meals before sleep.",
    ],
    followups: [
      "Do you have trouble falling asleep or staying asleep?",
      "Roughly how many hours of sleep do you usually get?",
    ],
    closers: [
      "Small, consistent changes compound over time.",
      "Start small — a 15 minute shift can make a difference.",
    ],
  },
  anxiety: {
    tags: ["anxiety","panic","panic attack","anxious","worry","stress"],
    openers: [
      "I’m sorry you’re feeling that.",
      "I hear you — anxiety can be intense.",
      "This is manageable with small steps.",
    ],
    cores: [
      "Try grounding: name 5 things you see, 4 things you can touch, 3 things you hear.",
      "Do slow breathing: inhale 4s — hold 4s — exhale 4s for several rounds.",
      "Shift attention to the body: notice sensations without judgment.",
    ],
    followups: [
      "Would you like me to guide a short breathing exercise now?",
      "Is this a one-off spike or something ongoing?",
    ],
    closers: ["If it feels severe or persistent, consider reaching out to a professional."],
  },
  coping: {
    tags: ["help","cope","support","overwhelmed","overwhelm","stressed"],
    openers: ["A helpful trick:", "One useful habit:", "A small suggestion:"],
    cores: [
      "Break tasks down into 2-minute steps and start with the smallest piece.",
      "Use a timer: work for 10 minutes, then take a 3 minute break.",
      "Try a short breathing break, then return to the task with a tiny next action.",
    ],
    followups: ["Tell me one task you’re facing and I’ll help break it down."],
    closers: ["You don’t need to do everything at once."],
  },
  breathing: {
    tags: ["breathe","breathing","box breathing","inhale","exhale","breath"],
    openers: ["Let’s breathe together.", "A short guided breath:", "Try this: "],
    cores: [
      "Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds — repeat 5 times.",
      "Longer exhale helps the nervous system — make your exhale a little longer than the inhale.",
      "Belly breathing (diaphragmatic) rather than shallow chest breathing is more calming.",
    ],
    followups: ["Want a 30s guided loop now?"],
    closers: ["I can count it out for you if you want."],
  },
  default: {
    tags: [],
    openers: ["Okay.", "Alright.", "Thanks for sharing."],
    cores: [
      "I can offer breathing exercises, sleep tips, grounding, and small practical steps.",
      "Tell me a bit more about what's happening and I’ll suggest a concrete next step.",
      "Sometimes a short 2-minute practice reduces intensity; would you like one?",
    ],
    followups: ["Can you tell me more about what you mean?", "Is this about sleep, anxiety, or something else?"],
    closers: ["I’m here to help however I can."],
  },
};

// Assemble a response from clause banks with small randomness and paraphrasing
function assembleResponse(intentKey, opts = {}) {
  const intent = INTENTS[intentKey] || INTENTS.default;
  const parts = [];

  // opener (50% of time include)
  if (Math.random() > 0.15) parts.push(pick(intent.openers));

  // core (1-2 lines)
  const coreCount = Math.random() > 0.6 ? 2 : 1;
  for (let i = 0; i < coreCount; i++) {
    parts.push(pick(intent.cores));
  }

  // extra dynamic bit (sleepHours etc)
  if (intentKey === "sleep" && opts.sleepHours != null) {
    const hrs = Number(opts.sleepHours);
    if (Number.isFinite(hrs)) {
      if (hrs < 5.5) parts.push("Noting your sleep hours are low — small gradual changes (15–30 minutes) can add up.");
      else if (hrs < 7) parts.push("You're close to a healthy range — consistency is the next step.");
      else parts.push("Nice — your sleep looks decent. Keep the routine.");
    }
  }

  // context mention (if provided)
  if (opts.recentUser && Math.random() > 0.4) {
    const snippet = opts.recentUser.length > 80 ? opts.recentUser.slice(0, 77) + "…" : opts.recentUser;
    parts.push(`(Thanks for sharing: "${snippet}")`);
  }

  // follow-up (ask a question about further help; 60% chance)
  if (Math.random() > 0.4 && intent.followups && intent.followups.length) {
    parts.push(pick(intent.followups));
  }

  // closer (occasionally)
  if (Math.random() > 0.5) parts.push(pick(intent.closers || []));

  // join and paraphrase a little
  let reply = parts.join(" ");
  reply = paraphraseSentence(reply);

  // final safety trim
  reply = reply.replace(/\s{2,}/g, " ").trim();
  if (!reply) reply = "I’m here to help — tell me more.";

  return reply;
}


function improvedResponder(userText, sleepHours = null, recentMessages = []) {
  const text = String(userText || "").trim();
  if (!text) return { type: "empty", reply: "Say anything you'd like — I can help with sleep tips, breathing, or coping strategies." };

  if (detectCrisis(text)) {
    return {
      type: "crisis",
      reply: "I'm really sorry you're feeling this way. If you're in immediate danger, call local emergency services now. If you have thoughts of harming yourself, contact your local crisis line immediately.",
    };
  }


  const faq = findFAQ(text);
  if (faq) {
    const reply = paraphraseSentence(pick([faq.a, faq.a + " Would you like more details or a short exercise?"]));
    return { type: "faq", reply };
  }

  const qTokens = tokens(text);

  // intent scoring
  const scores = {};
  for (const key of Object.keys(INTENTS)) {
    const intent = INTENTS[key];
    const overlap = tokenOverlapScore(qTokens, (intent.tags || []).join(" ") + " " + (intent.cores || []).join(" "));
    // tag boost: presence of any tag words in the query
    const tagBoost = (intent.tags || []).reduce((acc, t) => acc + (normalize(text).includes(t) ? 0.35 : 0), 0);
    scores[key] = overlap + tagBoost;
  }

  // boost intents that appear in recent messages
  if (recentMessages && recentMessages.length) {
    const recentText = recentMessages.slice(-6).map(m => m.role === "user" ? m.text : "").join(" ");
    const recentTok = tokens(recentText);
    for (const k of Object.keys(scores)) {
      const boost = tokenOverlapScore(recentTok, (INTENTS[k].tags || []).join(" "));
      scores[k] += boost * 0.6;
    }
  }

  // pick best
  let best = "default";
  let bestScore = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestScore) { best = k; bestScore = v; }
  }

  // fallback: if score tiny, use default but ask clarifying question
  if (bestScore < 0.12) {
    const reply = assembleResponse("default", { recentUser: recentMessages.slice().reverse().find(m => m.role === "user")?.text || "", sleepHours });
    return { type: "clarify", reply };
  }

  // build reply with context
  const recentUserMsg = recentMessages.slice().reverse().find(m => m.role === "user" && m.text && m.text.length > 20)?.text || "";
  const reply = assembleResponse(best, { sleepHours, recentUser: recentUserMsg });

  return { type: best, reply };
}

export default function Chatbot({ open = false, onClose = () => {}, apiUrl = null, sleepHours = null }) {
  const [messages, setMessages] = useState([
    { id: "sys", role: "system", text: "You are MindEcho — a supportive mental health assistant. Not a substitute for professional care." },
    { id: "intro", role: "assistant", text: "Hi — I'm MindEcho. I can offer breathing exercises, grounding, sleep tips, and supportive suggestions. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; }, [messages, open]);

  async function sendMessage() {
    const text = (input || "").trim();
    if (!text) return;
    const userMsg = { id: `u-${Date.now()}`, role: "user", text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      if (apiUrl) {
        // server mode unchanged
        const payloadMsgs = [...messages, userMsg].map(m => ({ role: m.role, content: m.text }));
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payloadMsgs }),
        });
        if (!res.ok) {
          const body = await res.text();
          setMessages(m => [...m, { id:`err-${Date.now()}`, role:"assistant", text: `Server error ${res.status}: ${body}` }]);
          throw new Error(`Server ${res.status}: ${body}`);
        }
        const data = await res.json();
        const assistantText = data?.reply || "Sorry — no reply from server.";
        setMessages(m => [...m, { id:`a-${Date.now()}`, role:"assistant", text: assistantText }]);
      } else {
        // improved local responder
        const resp = improvedResponder(text, sleepHours, messages);
        await new Promise(r => setTimeout(r, 300 + Math.random() * 450));
        setMessages(m => [...m, { id:`a-${Date.now()}`, role:"assistant", text: resp.reply }]);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(m => [...m, { id:`err-${Date.now()}`, role:"assistant", text: `Error: ${err.message || err}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  if (!open) return null;
  return (
    <div className="fixed right-6 bottom-6 z-[1200] w-[360px] md:w-[520px] bg-gradient-to-b from-gray-900/95 to-gray-800/95 border border-gray-800 rounded-2xl shadow-2xl p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-emerald-300" />
          <div>
            <div className="text-sm font-semibold">MindEcho — Chat</div>
            <div className="text-xs text-gray-400">Friendly guidance (not a replacement for clinicians)</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded bg-gray-800 hover:bg-gray-700"><X className="w-4 h-4 text-gray-200" /></button>
      </div>

      <div ref={containerRef} className="max-h-64 overflow-auto space-y-2 mb-3">
        {messages.map(m => (
          <div key={m.id} className={`p-2 rounded-lg ${m.role === "user" ? "bg-gray-800 text-gray-100 ml-auto w-fit" : "bg-gray-700/60 text-gray-100"}`}>
            <div className="text-xs text-gray-300 mb-1">{m.role === "user" ? "You" : m.role === "system" ? "System" : "MindCare"}</div>
            <div className="text-sm whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400">MindCare is typing…</div>}
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask about anxiety, sleep, coping..."
          className="flex-1 min-h-[44px] max-h-28 resize-none px-3 py-2 rounded bg-gray-900 border border-gray-800 text-gray-100 text-sm outline-none"
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading} className="px-3 py-2 rounded bg-emerald-400 text-black font-semibold">
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-2"><strong>Important:</strong> This assistant provides general information. If you're in crisis, contact local emergency services immediately.</div>
    </div>
  );
}
