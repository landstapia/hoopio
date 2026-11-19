let lastVibrateAt = 0;

function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function attachSwitchToButton(btn: HTMLButtonElement) {
  if (btn.dataset.hapticAttached === 'true') {
    const existing = btn.querySelector<HTMLInputElement>('input[data-haptic-switch="true"]');
    if (existing) {
      const isDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
      existing.disabled = isDisabled;
      existing.style.pointerEvents = isDisabled ? 'none' : 'auto';
    }
    return;
  }

  btn.dataset.hapticAttached = 'true';

  if (window.getComputedStyle(btn).position === 'static') {
    btn.style.position = 'relative';
  }

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.dataset.hapticSwitch = 'true';
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  const isDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
  input.disabled = isDisabled;

  // Keep native WebKit appearance intact (stripping appearance disables iOS Taptic Engine)
  Object.assign(input.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '0',
    opacity: '0.001',
    borderRadius: 'inherit',
    cursor: 'pointer',
    zIndex: '10',
    pointerEvents: isDisabled ? 'none' : 'auto',
    WebkitTapHighlightColor: 'transparent',
  });

  btn.appendChild(input);
}

/**
 * Enables native tactile feedback on mobile buttons:
 * - iPhone / iPad (WebKit): overlays a transparent native `<input type="checkbox" switch>`
 *   inside every button so direct finger taps fire the Taptic Engine.
 * - Android / Chromium: fires a 40ms `navigator.vibrate` pulse on pointerdown.
 */
export function installMobileHaptics(rootEl: HTMLElement): () => void {
  // Path A: iOS Safari / Chrome on iPhone & iPad
  if (isAppleTouchDevice()) {
    const syncAllButtons = () => {
      rootEl.querySelectorAll<HTMLButtonElement>('button').forEach(attachSwitchToButton);
    };

    syncAllButtons();

    const observer = new MutationObserver(() => {
      syncAllButtons();
    });

    observer.observe(rootEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled'],
    });

    return () => {
      observer.disconnect();
      rootEl
        .querySelectorAll<HTMLInputElement>('input[data-haptic-switch="true"]')
        .forEach((el) => el.remove());
      rootEl.querySelectorAll<HTMLButtonElement>('button[data-haptic-attached="true"]').forEach((btn) => {
        delete btn.dataset.hapticAttached;
      });
    };
  }

  // Path B: Android / Chromium Vibration API
  const onPointerDown = (e: PointerEvent) => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

    const target = e.target as HTMLElement | null;
    const btn = target?.closest('button');
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;

    const now = performance.now();
    if (now - lastVibrateAt < 50) return;
    lastVibrateAt = now;

    try {
      navigator.vibrate(40);
    } catch {
      // Ignore blocked vibration calls
    }
  };

  rootEl.addEventListener('pointerdown', onPointerDown, true);
  return () => {
    rootEl.removeEventListener('pointerdown', onPointerDown, true);
  };
}