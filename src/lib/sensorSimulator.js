// same simulator as before but exported so multiple components can use it
class EventEmitter { constructor(){ this.callbacks = {}; } on(e, cb){ if(!this.callbacks[e]) this.callbacks[e]=[]; this.callbacks[e].push(cb); return ()=> this.callbacks[e]=this.callbacks[e].filter(c=>c!==cb);} emit(e,d){ (this.callbacks[e]||[]).forEach(cb=>cb(d)); }}


export class SensorSimulator extends EventEmitter {
constructor(){ super(); this.interval = null; this.baseAnxiety = 0.5; }
start(consent){ if(this.interval) this.stop(); this.interval = setInterval(()=>{
this.baseAnxiety += (Math.random()-0.5)*0.08; this.baseAnxiety = Math.max(0,Math.min(1,this.baseAnxiety));
const signals = {};
if(consent.neurofeedback){ const alpha = (1-this.baseAnxiety)*70 + Math.random()*30; const beta = this.baseAnxiety*70 + Math.random()*30; signals.neuro={alpha:alpha.toFixed(2), beta:beta.toFixed(2)}; }
if(consent.camera){ const smile = (1-this.baseAnxiety)*0.6 + Math.random()*0.4; const frown = this.baseAnxiety*0.6 + Math.random()*0.4; signals.emotion={smile: smile.toFixed(3), frown: frown.toFixed(3)}; }
if(consent.audio){ const pitch = 100 + this.baseAnxiety*100 + (Math.random()-0.5)*20; const variance = this.baseAnxiety*5 + Math.random(); signals.acoustic={pitch: pitch.toFixed(2), variance: variance.toFixed(2)}; }
this.emit('signals', signals);
}, 1500); }
stop(){ if(this.interval){ clearInterval(this.interval); this.interval = null; }}
}


export const sensorSimulator = new SensorSimulator();