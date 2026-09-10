/**
 * Sistema Avançado e Universal de Resposta Tátil (Haptic Feedback) & Cliques Físicos
 * Suporte multi-plataforma:
 * - Motores de Vibração Nativos (Android, Chrome Mobile, Samsung Internet, Firefox, Edge, PWA)
 * - Taptic Engine Apple iOS (iPhone/iPad via Safari Switch Haptic Engine)
 * - WebHaptics Engine (Coordenação de micro-pulsos em tempo real)
 * - Micro-clique Acústico Tátil (Sintetizador Web Audio API de 15ms com latência zero)
 */

import { WebHaptics } from 'web-haptics';

const isBrowser = typeof window !== 'undefined';
const isIOS = isBrowser && (
  /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

// Padrões de vibração calibrados para superar a inércia dos motores móveis (25ms+)
const HAPTIC_PATTERNS = {
  selection: 28,
  tap: 32,
  light: 35,
  medium: 55,
  pop: 55,
  heavy: 85,
  impact: 95,
  success: [40, 60, 50],
  warning: [45, 60, 45],
  error: [60, 60, 60, 60, 75],
  burst: [35, 45, 35, 45, 65]
};

class HapticsManager {
  constructor() {
    this.hasVibrate = isBrowser && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.isIOS = isIOS;
    this.enabled = isBrowser && typeof localStorage !== 'undefined'
      ? localStorage.getItem('nexus_haptics_enabled') !== 'false'
      : true;

    // No iOS ou dispositivos sem motor físico nativo, cliques auditivos vêm ativados por padrão
    this.touchSoundsEnabled = isBrowser && typeof localStorage !== 'undefined'
      ? (localStorage.getItem('nexus_touch_sounds_enabled') !== null
          ? localStorage.getItem('nexus_touch_sounds_enabled') === 'true'
          : this.isIOS)
      : false;

    this.audioCtx = null;
    this.lastHapticTime = 0;
    this.iosSwitchLabel = null;
    this.iosSwitchInput = null;
    this.webHaptics = null;

    if (isBrowser) {
      try {
        this.webHaptics = new WebHaptics();
      } catch (e) {}
    }
  }

  initAudio() {
    if (!this.audioCtx && isBrowser) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  // Inicializa o elemento oculto do switch iOS para disparar o Taptic Engine no Safari/PWA
  ensureIOSTapticEngine() {
    if (!isBrowser || !document.body || this.iosSwitchLabel) return;
    try {
      const label = document.createElement('label');
      label.id = 'nexus-ios-taptic-anchor';
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;top:-100px;left:-100px;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-9999;overflow:hidden;';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      input.style.cssText = 'appearance:auto;opacity:0.001;pointer-events:none;';

      label.appendChild(input);
      document.body.appendChild(label);
      this.iosSwitchLabel = label;
      this.iosSwitchInput = input;
    } catch (e) {}
  }

  // Som sutil de clique mecânico/vidro no toque (micro-acústico de confirmação tátil)
  playTactileClick(volume = 0.05) {
    if (!isBrowser) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, this.audioCtx.currentTime + 0.015);

      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.015);
    } catch (e) {}
  }

  // Aciona o Taptic Engine do iOS via alternância do switch nativo
  triggerIOSTaptic() {
    if (!isBrowser) return;
    this.ensureIOSTapticEngine();
    if (this.iosSwitchLabel && this.iosSwitchInput) {
      try {
        this.iosSwitchInput.checked = !this.iosSwitchInput.checked;
        this.iosSwitchLabel.click();
      } catch (e) {}
    }
  }

  // Disparo centralizado de resposta tátil
  trigger(type = 'light') {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastHapticTime < 35) return; // Debounce de segurança
    this.lastHapticTime = now;

    // 1. Feedback Sonoro Tátil (se ativado ou padrão em dispositivos sem motor físico)
    if (this.touchSoundsEnabled) {
      const volume = type === 'heavy' || type === 'burst' ? 0.08 : 0.04;
      this.playTactileClick(volume);
    }

    // 2. Disparo no iOS Taptic Engine
    if (this.isIOS) {
      this.triggerIOSTaptic();
    }

    // 3. Disparo via WebHaptics
    if (this.webHaptics) {
      try {
        const preset = type === 'burst' ? 'nudge' : (HAPTIC_PATTERNS[type] ? type : 'light');
        this.webHaptics.trigger(preset).catch(() => {});
      } catch (e) {}
    }

    // 4. Disparo Direto no Motor Físico (Android, Chrome, PWAs com Vibration API)
    if (this.hasVibrate) {
      try {
        const pattern = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS.light;
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  light() { this.trigger('light'); }
  medium() { this.trigger('medium'); }
  heavy() { this.trigger('heavy'); }
  success() { this.trigger('success'); }
  warning() { this.trigger('warning'); }
  error() { this.trigger('error'); }
  selection() { this.trigger('selection'); }
  burst() { this.trigger('burst'); }

  isEnabled() {
    return Boolean(this.enabled);
  }

  isTouchSoundsEnabled() {
    return Boolean(this.touchSoundsEnabled);
  }

  playTouchClick() {
    this.playTactileClick(0.06);
  }

  getDeviceSupport() {
    return {
      hasVibrate: this.hasVibrate,
      isIOS: this.isIOS,
      isSupported: this.hasVibrate || this.isIOS,
      mode: this.hasVibrate ? 'android_motor' : (this.isIOS ? 'ios_taptic' : 'audio_emulation')
    };
  }

  toggleHaptics(forceState) {
    this.enabled = typeof forceState === 'boolean' ? forceState : !this.enabled;
    try {
      localStorage.setItem('nexus_haptics_enabled', String(this.enabled));
    } catch (e) {}
    if (this.enabled) {
      this.trigger('success');
    }
    return this.enabled;
  }

  toggleTouchSounds(forceState) {
    this.touchSoundsEnabled = typeof forceState === 'boolean' ? forceState : !this.touchSoundsEnabled;
    try {
      localStorage.setItem('nexus_touch_sounds_enabled', String(this.touchSoundsEnabled));
    } catch (e) {}
    if (this.touchSoundsEnabled) {
      this.playTactileClick(0.06);
    }
    return this.touchSoundsEnabled;
  }
}

export const haptics = new HapticsManager();

/**
 * Inicializador global de Resposta Tátil ao Toque:
 * Intercepta 'pointerdown' em todos os elementos interativos
 * com ativação instantânea do motor e desbloqueio do áudio.
 */
export function initTactileFeedback() {
  if (!isBrowser) return;

  let lastTouch = 0;

  const handleInteraction = (e) => {
    // Ignora botões secundários (ex: clique direito)
    if (e.button && e.button !== 0) return;

    const now = Date.now();
    if (now - lastTouch < 45) return;

    const target = e.target;
    if (!target || !(target instanceof Element)) return;

    const interactive = target.closest(
      'button, [role="button"], a, input[type="checkbox"], input[type="radio"], select, [data-haptic], .cursor-pointer, .tactile-btn, .tactile-press, [data-reaction-btn]'
    );

    if (interactive && !interactive.hasAttribute('disabled')) {
      lastTouch = now;
      // Desbloqueia contexto de áudio na primeira interação se suspenso
      if (haptics.audioCtx && haptics.audioCtx.state === 'suspended') {
        haptics.audioCtx.resume().catch(() => {});
      }
      const type = interactive.getAttribute('data-haptic') || 'light';
      haptics.trigger(type);
    }
  };

  window.addEventListener('pointerdown', handleInteraction, { passive: true });
}
