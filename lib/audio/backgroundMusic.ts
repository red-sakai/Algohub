/**
 * Background Music System
 * Procedural arcade-style background music using Web Audio API
 */

class BackgroundMusicManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private oscillators: OscillatorNode[] = [];
  private enabled: boolean = true;
  private volume: number = 0.15; // Lower volume for background music

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Start playing background music
   */
  play() {
    if (!this.audioContext || !this.masterGain || !this.enabled || this.isPlaying) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.playArcadeLoop();
  }

  /**
   * Stop playing background music
   */
  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator may already be stopped
      }
    });
    this.oscillators = [];
  }

  /**
   * Toggle music on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && !this.isPlaying) {
      this.play();
    } else if (!this.enabled && this.isPlaying) {
      this.stop();
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Check if music is playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if music is enabled
   */
  getIsEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play arcade-style ambient loop
   */
  private playArcadeLoop() {
    if (!this.audioContext || !this.masterGain || !this.isPlaying) return;

    // Chord progression: Am - F - C - G (relative minor feel, uplifting)
    const progression = [
      [220.0, 261.63, 329.63], // Am (A, C, E)
      [174.61, 220.0, 261.63], // F  (F, A, C)
      [261.63, 329.63, 392.0],  // C  (C, E, G)
      [196.0, 246.94, 293.66]   // G  (G, B, D)
    ];

    const chordDuration = 2.0; // 2 seconds per chord
    const totalDuration = progression.length * chordDuration;
    let currentTime = this.audioContext.currentTime;

    // Create arpeggio pattern for each chord
    progression.forEach((chord, chordIndex) => {
      const chordStartTime = currentTime + (chordIndex * chordDuration);

      // Play each note in the chord as an arpeggio
      chord.forEach((frequency, noteIndex) => {
        const noteStartTime = chordStartTime + (noteIndex * 0.15);
        
        // Main oscillator (sine wave for smooth tone)
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = frequency;
        
        // Envelope: fade in and out
        gain.gain.setValueAtTime(0, noteStartTime);
        gain.gain.linearRampToValueAtTime(0.08, noteStartTime + 0.1);
        gain.gain.setValueAtTime(0.08, noteStartTime + chordDuration - 0.3);
        gain.gain.linearRampToValueAtTime(0, noteStartTime + chordDuration);
        
        osc.connect(gain);
        gain.connect(this.masterGain!);
        
        osc.start(noteStartTime);
        osc.stop(noteStartTime + chordDuration);
        
        this.oscillators.push(osc);

        // Add subtle harmony (fifth above)
        const harmonyOsc = this.audioContext!.createOscillator();
        const harmonyGain = this.audioContext!.createGain();
        
        harmonyOsc.type = 'sine';
        harmonyOsc.frequency.value = frequency * 1.5; // Perfect fifth
        
        harmonyGain.gain.setValueAtTime(0, noteStartTime);
        harmonyGain.gain.linearRampToValueAtTime(0.03, noteStartTime + 0.1);
        harmonyGain.gain.setValueAtTime(0.03, noteStartTime + chordDuration - 0.3);
        harmonyGain.gain.linearRampToValueAtTime(0, noteStartTime + chordDuration);
        
        harmonyOsc.connect(harmonyGain);
        harmonyGain.connect(this.masterGain!);
        
        harmonyOsc.start(noteStartTime);
        harmonyOsc.stop(noteStartTime + chordDuration);
        
        this.oscillators.push(harmonyOsc);
      });
    });

    // Add bass line (plays on beat 1 of each chord)
    progression.forEach((chord, chordIndex) => {
      const chordStartTime = currentTime + (chordIndex * chordDuration);
      const bassFreq = chord[0] / 2; // Octave below root
      
      const bassOsc = this.audioContext!.createOscillator();
      const bassGain = this.audioContext!.createGain();
      
      bassOsc.type = 'triangle';
      bassOsc.frequency.value = bassFreq;
      
      bassGain.gain.setValueAtTime(0, chordStartTime);
      bassGain.gain.linearRampToValueAtTime(0.12, chordStartTime + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.01, chordStartTime + 0.8);
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain!);
      
      bassOsc.start(chordStartTime);
      bassOsc.stop(chordStartTime + 0.8);
      
      this.oscillators.push(bassOsc);
    });

    // Schedule next loop
    setTimeout(() => {
      if (this.isPlaying) {
        // Clear finished oscillators
        this.oscillators = [];
        this.playArcadeLoop();
      }
    }, totalDuration * 1000);
  }
}

// Singleton instance
export const backgroundMusic = new BackgroundMusicManager();
