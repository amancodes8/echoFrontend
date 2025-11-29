// src/components/FaceEmotionTrackerLocal.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * FaceEmotionTrackerLocal
 * Props:
 *  - onSignal(obj) receives { timestamp, calm, anxious, focus, rawExpressions }
 *  - sampleIntervalMs (default 700)
 *  - autoStart (default false)
 *
 * Requires face-api.js models in /models (public/models)
 * Put models under public/models and they will load at "/models".
 *
 * Uses CDN for face-api.js. If you bundle, install `face-api.js` and import instead.
 */
export default function FaceEmotionTrackerLocal({ onSignal = () => {}, sampleIntervalMs = 700, autoStart = false }) {
  const videoRef = useRef(null);
  const runningRef = useRef(false);
  const intervalRef = useRef(null);
  const [consent, setConsent] = useState(autoStart);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState(null);

  // load face-api script dynamically (CDN) and models from /models
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // load face-api from CDN if not bundled
        if (!window.faceapi) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js";
            s.crossOrigin = "anonymous";
            s.onload = res;
            s.onerror = rej;
            document.head.appendChild(s);
          });
        }

        // load models from /models
        const MODEL_URL = "/models";
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);

        if (mounted) setLoadingModels(false);
      } catch (err) {
        console.error("model load err", err);
        if (mounted) {
          setError("Failed to load models. Place models in /public/models and ensure they are accessible.");
          setLoadingModels(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!consent) return;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 360, height: 270 }, audio: false });
        if (!mounted) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        runningRef.current = true;

        intervalRef.current = setInterval(async () => {
          if (!runningRef.current) return;
          try {
            const options = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
            const detection = await window.faceapi
              .detectSingleFace(videoRef.current, options)
              .withFaceExpressions()
              .withFaceLandmarks();

            if (!detection) {
              // no face detected => neutral-ish small values
              onSignal({ timestamp: Date.now(), calm: 0.5, anxious: 0.0, focus: 0.4, rawExpressions: null });
              return;
            }

            const expressions = detection.expressions || {};
            // face-api expressions contain: neutral, happy, sad, angry, fearful, disgusted, surprised
            // Map them heuristically:
            const happy = expressions.happy ?? 0;
            const neutral = expressions.neutral ?? 0;
            const sad = expressions.sad ?? 0;
            const angry = expressions.angry ?? 0;
            const fearful = expressions.fearful ?? 0;
            const surprised = expressions.surprised ?? 0;

            // Heuristic mapping:
            // calm: high when happy/neutral and eyes steady => (happy*0.6 + neutral*0.4)
            // anxious: high when fearful/surprised/angry
            // focus: proxy using neutral + low surprise + closed-mouth indicator via landmarks (we'll use neutral-high)
            const calmRaw = Math.min(1, happy * 0.7 + neutral * 0.6 - fearful * 0.3);
            const anxiousRaw = Math.min(1, fearful * 0.7 + surprised * 0.5 + angry * 0.4);
            const focusRaw = Math.min(1, neutral * 0.6 + (1 - surprised) * 0.3 + (happy * 0.1));

            // optional landmark-based tweak: if mouth wide open (yawn/surprise) reduce focus
            const landmarks = detection.landmarks;
            let mouthOpenFactor = 0;
            try {
              const mouth = landmarks.getMouth();
              // mouth[14] bottom center, mouth[18] top center — these indices depend on library; compute vertical distance
              const topLip = mouth[13]; // approx
              const bottomLip = mouth[19]; // approx
              if (topLip && bottomLip) {
                const dy = Math.hypot(topLip.x - bottomLip.x, topLip.y - bottomLip.y);
                // normalize by face height (distance between nose and chin roughly)
                const nose = landmarks.getNose()[3];
                const jaw = landmarks.getJawOutline()[8];
                if (nose && jaw) {
                  const faceH = Math.hypot(nose.x - jaw.x, nose.y - jaw.y) || 1;
                  mouthOpenFactor = Math.min(1, dy / faceH);
                }
              }
            } catch (e) {
              // ignore landmark math errors
            }

            const focusAdj = Math.max(0, focusRaw - mouthOpenFactor * 0.6);

            // final normalized signals 0..1
            const calm = Math.max(0, Math.min(1, calmRaw));
            const anxious = Math.max(0, Math.min(1, anxiousRaw));
            const focus = Math.max(0, Math.min(1, focusAdj));

            onSignal({ timestamp: Date.now(), calm, anxious, focus, rawExpressions: expressions });
          } catch (err) {
            console.warn("frame detect err", err);
          }
        }, sampleIntervalMs);
      } catch (err) {
        console.error("camera err", err);
        setError("Unable to access camera. Check permissions.");
      }
    };

    start();

    return () => {
      mounted = false;
      runningRef.current = false;
      clearInterval(intervalRef.current);
      const s = videoRef.current?.srcObject;
      if (s && s.getTracks) s.getTracks().forEach((t) => t.stop());
    };
  }, [consent, sampleIntervalMs, onSignal]);

  return (
    <div className="space-y-2">
      {loadingModels ? (
        <div className="text-xs text-gray-400">Loading models… (place face-api models in /models)</div>
      ) : (
        <>
          {!consent ? (
            <div className="text-sm">
              <div className="text-xs text-gray-400">Run local camera-based emotion estimation (models loaded in browser). Consent to continue?</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setConsent(true)} className="px-3 py-2 rounded bg-indigo-600 text-white">Yes, start</button>
                <button onClick={() => setConsent(false)} className="px-3 py-2 rounded bg-gray-700 text-white">No</button>
              </div>
            </div>
          ) : (
            <div>
              <video ref={videoRef} className="rounded-md bg-black w-full" style={{ width: 320, height: 240 }} muted playsInline />
              <div className="text-xs text-gray-400 mt-1">Local detection — frames stay in your browser.</div>
              {error && <div className="text-xs text-red-400">{error}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
