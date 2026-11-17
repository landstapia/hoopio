/* buzzer.js - the basketball buzzer sound (made with the browser's audio, no sound file needed).
   The buzzer state lives in the shared "live" data, so it sounds on the /scoreboard screen:
     live.buzzOn   = true while the Buzzer button is held down (longer press = longer buzz)
     live.buzzLeft = automatic buzzer milliseconds (timeout start / end)
   Browsers only allow sound after the person has clicked or pressed a key once on that page. */

const Buzzer = {
  ctx: null,       // audio context
  voice: null,     // the sound that is playing right now

  unlock() {                                   // call from a click / key press
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state == 'suspended') this.ctx.resume();
  },
  get ready() { return !!this.ctx && this.ctx.state == 'running'; },

  // Sound here? Always on /scoreboard; on other pages only if "play the buzzer sound on this device" is ticked.
  here() { return currentPage == 'scoreboard' || currentPage == 'custom-scoreboard' || localStorage.buzzHere == '1'; },

  // kind: 'game' (the normal buzzer) or 'shot' (the shot clock buzzer). If the kind changes while a sound plays, the sound is swapped.
  sync(shouldSound, kind = 'game') {
    if (!shouldSound) return this.stop();
    if (this.voice && this.voice.kind != kind) this.stop();
    this.start(kind);
  },

  start(kind = 'game') {
    if (this.voice || !this.ready) return;
    const c = this.ctx, t = c.currentTime, shot = kind == 'shot';
    const out = c.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.28, t + 0.02);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    out.connect(c.destination);
    // game buzzer: harsh and low (233 Hz, steady).   shot clock buzzer: the same steady sound, a little higher (294 Hz, about 4 semitones up).
    // To change the pitch of the shot clock tone, edit the three numbers on the 'shot' line below.
    const tones = shot ? [['sawtooth', 294], ['sawtooth', 297], ['square', 588]] : [['sawtooth', 233], ['sawtooth', 236], ['square', 466]];
    filter.connect(out);
    const extra = [];
    const oscillators = tones.map(([type, hz]) => {
      const o = c.createOscillator();
      o.type = type; o.frequency.value = hz;
      o.connect(filter); o.start();
      return o;
    }).concat(extra);
    this.voice = { out, oscillators, kind };
  },

  stop() {
    if (!this.voice) return;
    const { out, oscillators } = this.voice, t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(0, t, 0.03);
    oscillators.forEach(o => o.stop(t + 0.2));
    this.voice = null;
  },
};

const isBuzzing = () => LV().buzzOn || LV().buzzLeft > 0;
// Which buzzer does THIS page listen to? The custom scoreboard pages have their own buzzer, separate from the live game.
const isCustomPage = () => currentPage == 'custom-scoreboard' || currentPage == 'custom-controls';
const buzzingHere = () => isCustomPage() ? (DB.custom.buzzOn || DB.custom.buzzLeft > 0) : isBuzzing();
// 'shot' only while the automatic shot clock buzzer is running (a held Buzzer button is always the normal buzzer)
const buzzKindHere = () => { const x = isCustomPage() ? DB.custom : LV(); return !x.buzzOn && x.buzzKind == 'shot' ? 'shot' : 'game'; };

// Any click or key press unlocks sound on this page
$(document).on('pointerdown keydown', () => Buzzer.unlock());

/* ---------- The Buzzer button on /scoresheet: sounds while held ---------- */
let buzzHeld = false, buzzTarget = 'live';
const LONG_BUZZ_MS = 3000;                         // the "Long buzzer" button
// target: 'live' (the live game, default) or 'custom' (the custom scoreboard)
function buzzStart(target = 'live') {
  if (buzzHeld) return;
  buzzHeld = true;
  buzzTarget = target;
  Buzzer.unlock();
  quiet(target == 'custom' ? { custom: { buzzOn: true }, log: 'CUSTOM BUZZER pressed' } : { live: { buzzOn: true }, log: 'BUZZER pressed' });   // quiet = no page redraw, so the button stays pressed
}
function buzzStop() {
  if (!buzzHeld) return;
  buzzHeld = false;
  quiet(buzzTarget == 'custom' ? { custom: { buzzOn: false } } : { live: { buzzOn: false } });
}
// One press = a long buzz of fixed length (handy on a phone where holding a button is awkward)
function buzzLong(target = 'live') {
  Buzzer.unlock();
  quiet(target == 'custom' ? { custom: { buzzLeft: LONG_BUZZ_MS }, log: 'CUSTOM LONG BUZZER' } : { live: { buzzLeft: LONG_BUZZ_MS }, log: 'LONG BUZZER' });
}
$(window).on('pointerup pointercancel blur', buzzStop);       // released anywhere = stop
