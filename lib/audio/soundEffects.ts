/**
 * Sound Effects Manager
 * Uses Web Audio API for game sounds
 */

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.3;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private createOscillator(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Envelope
    gainNode.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Play launch sound - whoosh effect
   */
  playLaunch(): void {
    if (!this.audioContext || !this.enabled) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gainNode.gain.setValueAtTime(this.masterVolume * 0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  /**
   * Play node hit sound - pitch varies by node depth
   */
  playNodeHit(depth: number = 0): void {
    const baseFrequency = 523.25; // C5
    const frequency = baseFrequency + (depth * 50);
    this.createOscillator(frequency, 0.15, 'triangle');
  }

  /**
   * Play wrong node sound - error buzz
   */
  playWrongNode(): void {
    this.createOscillator(150, 0.2, 'square');
  }

  /**
   * Play completion sound - success fanfare
   */
  playComplete(): void {
    if (!this.audioContext || !this.enabled) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C chord
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.createOscillator(freq, 0.3, 'sine');
      }, i * 100);
    });
  }

  /**
   * Play combo sound - ascending tone
   */
  playCombo(comboCount: number): void {
    const frequency = 400 + (comboCount * 100);
    this.createOscillator(frequency, 0.1, 'square');
  }

  /**
   * Play UI click sound
   */
  playClick(): void {
    this.createOscillator(800, 0.05, 'sine');
  }

  /**
   * Toggle sound effects
   */
  toggle(): void {
    this.enabled = !this.enabled;
  }

  /**
   * Get master volume
   */
  getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const soundEffects = new SoundEffectsManager();
