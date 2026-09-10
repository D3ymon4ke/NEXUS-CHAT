/**
 * Sistema Avançado de Resposta Tátil (Haptic Feedback) & Cliques Físicos
 * Proporciona sensação tátil ultra-responsiva de toque nativo (como iOS e Android).
 */

class HapticsManager {
  constructor() {
    this.hasVibrate = typeof navigator !== 'undefined' && Boolean(navigator.vibrate);
    this.enabled = typeof localStorage !== 'undefined'
      ? localStorage.getItem('nexus_haptics_enabled') !== 'false'
      : true;
    this.touchSoundsEnabled = typeof localStorage !== 'undefined'
      ? localStorage.getItem('nexus_touch_sounds_enabled') === 'true'
      : false;
    this.audioCtx = null;
    this.lastHapticTime = 0;
  }

  initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
  }

  // Som sutil de clique mecânico/vidro no toque (micro-acústico de confirmação tátil)
  playTactileClick() {
    if (!this.touchSoundsEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      // Frequência rápida de estalo suave
      osc.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.015);

      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.015);
    } catch (e) {}
  }

  // Disparo de vibração tátil com padrões otimizados para motores de vibração de smartphones
  trigger(type = 'light') {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastHapticTime < 40) return; // Debounce de segurança
    this.lastHapticTime = now;

    if (this.touchSoundsEnabled) {
      this.playTactileClick();
    }

    if (!this.hasVibrate) return;

    try {
      switch (type) {
        case 'selection':
        case 'tap':
        case 'light':
          navigator.vibrate(10); // Pulso sutil e seco
          break;
        case 'medium':
        case 'pop':
          navigator.vibrate(20); // Clique mais nítido
          break;
        case 'heavy':
        case 'impact':
          navigator.vibrate(40); // Impacto pesado (ex: excluir, banir)
          break;
        case 'success':
          navigator.vibrate([12, 35, 18]); // Batida dupla positiva (enviado, comprado)
          break;
        case 'warning':
          navigator.vibrate([20, 30, 20]);
          break;
        case 'error':
          navigator.vibrate([35, 40, 35]); // Três batidas curtas de recusa
          break;
        case 'burst':
          navigator.vibrate([8, 15, 8, 15, 25]); // Tremor festivo de moedas/burst
          break;
        default:
          navigator.vibrate(12);
      }
    } catch (e) {}
  }

  light() {
    this.trigger('light');
  }

  medium() {
    this.trigger('medium');
  }

  heavy() {
    this.trigger('heavy');
  }

  success() {
    this.trigger('success');
  }

  error() {
    this.trigger('error');
  }

  selection() {
    this.trigger('selection');
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
      this.playTactileClick();
    }
    return this.touchSoundsEnabled;
  }
}

export const haptics = new HapticsManager();

/**
 * Inicializador global de Resposta Tátil ao Toque:
 * Intercepta 'pointerdown' (zero latência física sob a ponta do dedo) em todos os elementos interativos.
 */
export function initTactileFeedback() {
  if (typeof window === 'undefined') return;

  let lastTouch = 0;

  const handlePointerDown = (e) => {
    // Ignora cliques do botão direito do mouse
    if (e.button && e.button !== 0) return;

    const now = Date.now();
    if (now - lastTouch < 50) return;

    const target = e.target;
    if (!target || !(target instanceof Element)) return;

    const interactive = target.closest(
      'button, [role="button"], a, input[type="checkbox"], input[type="radio"], select, [data-haptic], .cursor-pointer, .tactile-btn, .tactile-press'
    );

    if (interactive && !interactive.hasAttribute('disabled')) {
      lastTouch = now;
      const type = interactive.getAttribute('data-haptic') || 'light';
      haptics.trigger(type);
    }
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
}
