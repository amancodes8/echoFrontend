// src/components/InferForm.jsx
import React, { useState, useRef } from 'react';
import { Camera, Mic, Upload } from 'lucide-react';


export default function InferForm({ onSubmit, defaultUserId }) {
const [imageFile, setImageFile] = useState(null);
const [audioFile, setAudioFile] = useState(null);
const [eegFile, setEegFile] = useState(null);
const [userId, setUserId] = useState(defaultUserId || 'guest');
const [recording, setRecording] = useState(false);
const [recUrl, setRecUrl] = useState(null);
const mediaRecorderRef = useRef(null);
const chunksRef = useRef([]);


// audio recorder
const startRecording = async () => {
setRecUrl(null);
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mr = new MediaRecorder(stream);
mediaRecorderRef.current = mr;
chunksRef.current = [];
mr.ondataavailable = (e) => chunksRef.current.push(e.data);
mr.onstop = () => {
const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
setAudioFile(new File([blob], `recording.webm`, { type: blob.type }));
setRecUrl(URL.createObjectURL(blob));
stream.getTracks().forEach(t => t.stop());
setRecording(false);
};
mr.start();
setRecording(true);
};
const stopRecording = () => mediaRecorderRef.current?.stop();


// webcam snapshot
const videoRef = useRef(null);
const canvasRef = useRef(null);
const [cameraOn, setCameraOn] = useState(false);
const startCamera = async () => {
setCameraOn(true);
const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
videoRef.current.srcObject = s;
videoRef.current.play();
};
const stopCamera = () => {
setCameraOn(false);
const s = videoRef.current?.srcObject;
if (s) s.getTracks().forEach(t => t.stop());
videoRef.current.srcObject = null;
};
const captureSnapshot = () => {
const canvas = canvasRef.current;
const v = videoRef.current;
if (!canvas || !v) return;
canvas.width = v.videoWidth;
canvas.height = v.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
canvas.toBlob((blob) => {
const file = new File([blob], `snapshot.png`, { type: 'image/png' });
setImageFile(file);
});
};


const handleSubmit = (e) => {
e.preventDefault();
// small client-side validation
if (!imageFile && !audioFile && !eegFile) {
return alert('Please provide at least one modality (image, audio, or EEG).');
}
onSubmit({ imageFile, audioFile, eegFile, userId });
};


return (
<form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow">
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<label className="block">
<div className="text-sm font-medium text-gray-700">User ID</div>
<input value={userId} onChange={e => setUserId(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
</label>


<label className="block">
<div className="text-sm font-medium text-gray-700">EEG file (.json or .npy)</div>
<input type="file" accept=".json,.npy,application/json" onChange={e => setEegFile(e.target.files?.[0] || null)} />
</label>


<label className="block">
<div className="text-sm font-medium text-gray-700">Image (jpg/png)</div>
<input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
{imageFile && <div className="text-xs text-gray-500 mt-1">Selected: {imageFile.name}</div>}
</label>


<label className="block">
<div className="text-sm font-medium text-gray-700">Audio</div>
<input type="file" accept="audio/*" onChange={e => { setAudioFile(e.target.files?.[0] || null); setRecUrl(null); }} />
{audioFile && <div className="text-xs text-gray-500 mt-1">Selected: {audioFile.name}</div>}
{recUrl && (
<audio controls className="mt-2 w-full"><source src={recUrl} /></audio>
)}
</label>
</div>


<div className="mt-4 flex items-center gap-3">
<button type="button" onClick={() => (recording ? stopRecording() : startRecording())} className="px-3 py-2 bg-purple-600 text-white rounded flex items-center gap-2">
<Mic className="w-4 h-4" /> {recording ? 'Stop' : 'Record'}
</button>


<div>
<button type="button" onClick={() => (cameraOn ? stopCamera() : startCamera())} className="px-3 py-2 bg-gray-100 rounded">
<Camera className="w-4 h-4 inline-block mr-2" /> {cameraOn ? 'Stop Camera' : 'Open Camera'}
</button>
{cameraOn && (
<button type="button" onClick={captureSnapshot} className="ml-2 px-3 py-2 bg-blue-600 text-white rounded">Capture</button>
)}
</div>


<button type="submit" className="ml-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded">Run Inference</button>
</div>


{cameraOn && (
<div className="mt-4">
<video ref={videoRef} className="w-full rounded-lg border" playsInline muted />
<canvas ref={canvasRef} className="hidden" />
</div>
)}
</form>
);
}