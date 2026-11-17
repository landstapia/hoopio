/* feedback.js - press feedback for every button (a Material-style ripple from the touch point; look: css/m3.css)
   plus haptics on the buttons marked data-haptic (+24, +14, game clock and shot clock start / pause):
     Android:  haptic() = navigator.vibrate, called by the button functions in ctl.js
     iPhone:   a transparent switch overlay on those buttons (see below). */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('button');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s);
  setTimeout(() => s.remove(), 600);
}, { passive: true });

// Android: a short vibration. (iPhone has no vibrate(), see the overlay below.)
function haptic(ms = 15) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (err) {}
}

/* iPhone (Safari and Chrome): since iOS 26.5 a script can no longer trigger the tap - only a REAL finger tap on a <input type="checkbox" switch> does.
   So every button marked data-haptic gets a transparent label on top of it that contains a hidden switch: the finger taps the label,
   iOS forwards the tap to the switch (= haptic) and the click still reaches the button's own onclick once.
   (Needs "System Haptics" on in Settings > Sounds & Haptics.) */
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform == 'MacIntel' && navigator.maxTouchPoints > 1);
function addHapticOverlay(btn) {
  if (btn.querySelector(':scope > .hp')) return;
  const label = document.createElement('label');
  label.className = 'hp';
  label.style.cssText = 'position:absolute;inset:0;z-index:3;margin:0;background:transparent;-webkit-tap-highlight-color:transparent';
  const sw = document.createElement('input');
  sw.type = 'checkbox';
  sw.setAttribute('switch', '');
  sw.style.cssText = 'visibility:hidden;position:absolute;pointer-events:none';
  sw.addEventListener('click', e => e.stopPropagation());       // the label forwards a click to the switch: do not let it reach the button twice
  label.appendChild(sw);
  btn.appendChild(label);
}
if (IS_IOS) {
  const scan = () => document.querySelectorAll('button[data-haptic]').forEach(addHapticOverlay);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', scan);
  scan();
}
