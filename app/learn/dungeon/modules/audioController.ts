import Phaser from "phaser";

export class AudioController {
  private scene: Phaser.Scene;
  private bgMusic!: Phaser.Sound.BaseSound;
  private buttonClickSound!: Phaser.Sound.BaseSound;
  private swordSound!: Phaser.Sound.BaseSound;

  private bgMusicVolume: number = 0.2; // Base volume for background music
  private duckedVolume: number = 0.08; // Volume when ducked
  private duckDuration: number = 300; // How long to duck in ms
  private duckTimer: Phaser.Time.TimerEvent | null = null;
  private isDucked: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    // Load audio files
    this.scene.load.audio("bg-music", "/sprite/audio/bg_music.mp3");
    this.scene.load.audio("button-click", "/sprite/audio/button.mp3");
    this.scene.load.audio("sword-sound", "/sprite/audio/sword_1.mp3");
  }

  create() {
    // Create background music (looping)
    this.bgMusic = this.scene.sound.add("bg-music", {
      loop: true,
      volume: this.bgMusicVolume,
    });

    // Create button click sound
    this.buttonClickSound = this.scene.sound.add("button-click", {
      volume: 0.6,
    });

    // Create sword sound
    this.swordSound = this.scene.sound.add("sword-sound", {
      volume: 0.7,
    });

    // Start background music
    this.bgMusic.play();
  }

  playButtonClick() {
    if (this.buttonClickSound) {
      this.buttonClickSound.play();
      this.duckBackgroundMusic();
    }
  }

  playSwordSound() {
    if (this.swordSound) {
      this.swordSound.play();
      this.duckBackgroundMusic();
    }
  }

  private duckBackgroundMusic() {
    if (!this.bgMusic || !this.bgMusic.isPlaying) return;

    // Cancel existing duck timer if any
    if (this.duckTimer) {
      this.duckTimer.destroy();
      this.duckTimer = null;
    }

    // If already ducked, just reset the timer
    if (this.isDucked) {
      this.resetDuckTimer();
      return;
    }

    // Duck the music
    this.isDucked = true;
    this.bgMusic.setVolume(this.duckedVolume);

    // Reset duck timer
    this.resetDuckTimer();
  }

  private resetDuckTimer() {
    if (this.duckTimer) {
      this.duckTimer.destroy();
    }

    this.duckTimer = this.scene.time.delayedCall(this.duckDuration, () => {
      if (this.bgMusic && this.bgMusic.isPlaying) {
        this.bgMusic.setVolume(this.bgMusicVolume);
        this.isDucked = false;
      }
      this.duckTimer = null;
    });
  }

  duckForDuration(duration: number = 500) {
    if (!this.bgMusic || !this.bgMusic.isPlaying) return;

    // Cancel existing duck timer if any
    if (this.duckTimer) {
      this.duckTimer.destroy();
      this.duckTimer = null;
    }

    // Duck the music
    this.isDucked = true;
    this.bgMusic.setVolume(this.duckedVolume);

    // Reset after duration
    this.duckTimer = this.scene.time.delayedCall(duration, () => {
      if (this.bgMusic && this.bgMusic.isPlaying) {
        this.bgMusic.setVolume(this.bgMusicVolume);
        this.isDucked = false;
      }
      this.duckTimer = null;
    });
  }

  setBackgroundVolume(volume: number) {
    this.bgMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic && !this.isDucked) {
      this.bgMusic.setVolume(this.bgMusicVolume);
    }
  }

  stop() {
    if (this.bgMusic) {
      this.bgMusic.stop();
    }
    if (this.duckTimer) {
      this.duckTimer.destroy();
      this.duckTimer = null;
    }
  }

  pause() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  resume() {
    if (this.bgMusic && this.bgMusic.isPaused) {
      this.bgMusic.resume();
    }
  }
}
