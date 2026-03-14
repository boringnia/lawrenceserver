// Simple procedural sound manager using Web Audio API
class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  playJump() {
    this.playTone(400, 'square', 0.2, 0.05);
  }

  playAttack() {
    this.playTone(200, 'sawtooth', 0.3, 0.08);
  }

  playExplosion() {
    this.playTone(100, 'triangle', 0.5, 0.15);
  }

  playPickup() {
    this.playTone(1200, 'sine', 0.15, 0.05);
  }
}

export const sounds = new SoundManager();
