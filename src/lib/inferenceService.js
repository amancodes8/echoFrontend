// src/lib/inferenceService.js

export const inferenceService = {
  // small FIFO buffer of recent signals
  signalBuffer: [],

  /**
   * Infer a high-level emotion from raw signals.
   * - newSignals: object possibly containing { neuro: {alpha, beta}, emotion: {smile, frown}, acoustic: {pitch, variance} }
   * - consent: object { neurofeedback: bool, camera: bool, audio: bool }
   *
   * Returns:
   * { primary: 'neutral'|'anxious'|'calm'|'focused', scores: { anxiety: 0..1, calm: 0..1, focus: 0..1 } }
   */
  inferEmotion: (newSignals = {}, consent = { neurofeedback: false, camera: false, audio: false }) => {
    try {
      // push and keep last N readings
      inferenceService.signalBuffer.push(newSignals || {});
      if (inferenceService.signalBuffer.length > 6) {
        inferenceService.signalBuffer.shift();
      }

      let anxiety = 0;
      let calm = 0;
      let focus = 0;
      let contributingFactors = 0;

      inferenceService.signalBuffer.forEach((signals) => {
        if (!signals) return;

        // Neurofeedback: use alpha (calm) and beta (anxiety)
        if (consent.neurofeedback && signals.neuro) {
          const alpha = parseFloat(signals.neuro.alpha) || 0;
          const beta = parseFloat(signals.neuro.beta) || 0;
          anxiety += beta;
          calm += alpha;
          // focus as a simple blend of alpha & beta (placeholder)
          focus += (alpha + beta) / 2;
          contributingFactors++;
        }

        // Camera/micro-expression: smile (calm) vs frown (anxiety)
        if (consent.camera && signals.emotion) {
          const smile = parseFloat(signals.emotion.smile) || 0;
          const frown = parseFloat(signals.emotion.frown) || 0;
          anxiety += frown * 100; // align ranges with neuro (0-100)
          calm += smile * 100;
          contributingFactors++;
        }

        // Acoustic: variance -> anxiety proxy (amplify), lower variance -> calm
        if (consent.audio && signals.acoustic) {
          const variance = parseFloat(signals.acoustic.variance) || 0;
          // amplify variance impact so it sits in a similar magnitude
          anxiety += variance * 10;
          // invert variance for calm score (higher variance -> less calm)
          calm += Math.max(0, 10 - variance * 10);
          contributingFactors++;
        }
      });

      // No contributing sensors -> neutral fallback
      if (contributingFactors === 0) {
        return {
          primary: 'neutral',
          scores: { anxiety: 0, calm: 0, focus: 0 }
        };
      }

      // Compute averages and normalize roughly into 0..1
      const avgAnxiety = (anxiety / contributingFactors) / 100;
      const avgCalm = (calm / contributingFactors) / 100;
      const avgFocus = (focus / contributingFactors) / 100;

      // Decide the primary label (simple rule-based)
      let primary = 'neutral';
      if (avgAnxiety > 0.6 && avgAnxiety > avgCalm) {
        primary = 'anxious';
      } else if (avgCalm > 0.6 && avgCalm > avgAnxiety) {
        primary = 'calm';
      } else if (avgFocus > 0.6) {
        primary = 'focused';
      } else {
        primary = 'neutral';
      }

      // Scale and clamp scores to [0,1]
      const scores = {
        anxiety: Math.max(0, Math.min(1, avgAnxiety * 1.5)),
        calm: Math.max(0, Math.min(1, avgCalm * 1.5)),
        focus: Math.max(0, Math.min(1, avgFocus * 1.2))
      };

      return { primary, scores };
    } catch (err) {
      // In case something unexpected arrives, fail gracefully
      console.error('inferenceService.inferEmotion error:', err);
      return { primary: 'neutral', scores: { anxiety: 0, calm: 0, focus: 0 } };
    }
  },

  /**
   * Utility: clear the signal buffer (useful when user toggles sensors or for tests)
   */
  clearBuffer: () => {
    inferenceService.signalBuffer.length = 0;
  }
};

export default inferenceService;
