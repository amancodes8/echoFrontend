// src/utils/formatInferenceResult.js
const EMOTION_LABELS = ['Calm','Neutral','Sad','Angry','Happy','Focused','Energized'];

/**
 * pickTemplate - choose a message template randomly from a list
 */
function pickTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * describeValenceArousal - human readable sentiment
 */
function describeValenceArousal(valence, arousal) {
  if (valence == null || arousal == null) return { summary: 'State unavailable', tone: 'neutral' };

  if (valence >= 0.7 && arousal >= 0.7) return { summary: 'You seem upbeat and energized.', tone: 'positive' };
  if (valence >= 0.7 && arousal < 0.6) return { summary: 'You appear calm and positive.', tone: 'calm' };
  if (valence < 0.4 && arousal >= 0.6) return { summary: 'You might be tense or stressed.', tone: 'stressed' };
  if (valence < 0.4 && arousal < 0.6) return { summary: 'You might be low-energy or down.', tone: 'low' };
  return { summary: 'You look fairly balanced — a small break might help maintain focus.', tone: 'neutral' };
}

/**
 * chooseRecommendation - choose from a small pool per tone and dominant emotion.
 * Add some randomization so users don't get identical text each time.
 */
function chooseRecommendation(tone, dominantEmotion) {
  const base = {
    positive: [
      { id: 'micro_journal', title: '2-min gratitude jot', desc: 'Write 3 quick things you’re grateful for.' },
      { id: 'micro_focus', title: '10-min focused sprint', desc: 'Tackle one small task while you’re energized.' }
    ],
    calm: [
      { id: 'micro_journal', title: '2-min reflection', desc: 'Write one short sentence about how you feel.' },
      { id: 'micro_stretch', title: '2-min stretch', desc: 'Gentle standing stretch to stay relaxed.' }
    ],
    stressed: [
      { id: 'breathing', title: '3-min breathing', desc: 'Box breathing: 4-4-4-4 — inhale, hold, exhale, hold.' },
      { id: 'micro_grounding', title: '2-min grounding', desc: 'Stand, stretch, and take five deep breaths.' }
    ],
    low: [
      { id: 'walk', title: '5-min walk', desc: 'Step outside and take a brief walk to lift energy.' },
      { id: 'music', title: 'Mood music', desc: 'Play an uplifting 3-minute track.' }
    ],
    neutral: [
      { id: 'checkin', title: 'Quick check-in', desc: 'Do a 60-second body scan to maintain balance.' },
      { id: 'micro_task', title: 'Small productive task', desc: 'Pick one small task and finish it.' }
    ]
  };

  // prefer recommendations that match dominantEmotion when relevant
  const emoPref = {
    Focused: { id: 'micro_task', title: 'Small productive task', desc: 'Use current focus to finish one thing.' },
    Energized: { id: 'micro_sprint', title: 'Short sprint', desc: 'Use this energy for a 10-min focused sprint.' },
    Sad: { id: 'gentle_move', title: 'Gentle movement', desc: 'Try light stretching or walking for mood uplift.' },
  };

  if (emoPref[dominantEmotion]) {
    // 60% chance pick emoPref, otherwise from tone pool
    if (Math.random() < 0.6) return emoPref[dominantEmotion];
  }

  const pool = base[tone] || base.neutral;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * main formatter
 * returns:
 * {
 *  dominantEmotion, dominantConfidence,
 *  valence, arousal,
 *  moodSummary, friendlyText, recommendation: {exercise_id, title, desc}
 * }
 */
export default function formatInferenceResult(raw) {
  if (!raw) return null;

  const emotion_dist = Array.isArray(raw.emotion_dist) ? raw.emotion_dist : [];
  const valence = typeof raw.valence === 'number' ? raw.valence : null;
  const arousal = typeof raw.arousal === 'number' ? raw.arousal : null;

  // dominant emotion
  let dominantIndex = -1;
  let dominantConf = 0;
  if (emotion_dist.length) {
    dominantIndex = emotion_dist.indexOf(Math.max(...emotion_dist));
    dominantConf = emotion_dist[dominantIndex];
  }
  const dominantEmotion = EMOTION_LABELS[dominantIndex] || 'Unknown';

  // valence/arousal description
  const { summary: moodSummary, tone } = describeValenceArousal(valence, arousal);

  // varied friendly text templates
  const templates = {
    positive: [
      `You're looking positive right now — ${moodSummary}`,
      `Nice — you seem upbeat. ${moodSummary}`,
      `Good energy — ${moodSummary}`
    ],
    calm: [
      `You're calm — ${moodSummary}`,
      `A peaceful moment: ${moodSummary}`
    ],
    stressed: [
      `You may be feeling tense. ${moodSummary}`,
      `Stress detected — ${moodSummary}`
    ],
    low: [
      `Low energy noticed. ${moodSummary}`,
      `You may feel a bit down. ${moodSummary}`
    ],
    neutral: [
      `Balanced state. ${moodSummary}`,
      `All good — ${moodSummary}`
    ]
  };

  const friendlyText = pickTemplate(templates[tone] || templates.neutral);

  // pick a recommendation (varies each call)
  const recommendation = chooseRecommendation(tone, dominantEmotion);

  // compute confidence phrasing
  const confidenceText = dominantConf > 0.6
    ? 'High confidence'
    : dominantConf > 0.3
      ? 'Moderate confidence'
      : 'Low confidence — result is uncertain';

  return {
    dominantEmotion,
    dominantConfidence: dominantConf,
    valence,
    arousal,
    moodSummary,
    friendlyText,
    confidenceText,
    recommendation
  };
}
