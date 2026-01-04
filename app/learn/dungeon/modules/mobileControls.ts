import Phaser from "phaser";

export interface VirtualInput {
  moveX: number;
  moveY: number;
  attack: boolean;
  jump: boolean;
  ult: boolean;
  attackJustPressed: boolean;
  jumpJustPressed: boolean;
  ultJustPressed: boolean;
}

export class MobileControls {
  private scene: Phaser.Scene;
  private isMobile: boolean;
  private virtualInput: VirtualInput = {
    moveX: 0,
    moveY: 0,
    attack: false,
    jump: false,
    ult: false,
    attackJustPressed: false,
    jumpJustPressed: false,
    ultJustPressed: false,
  };

  // Joystick
  private joystickBase!: Phaser.GameObjects.Ellipse;
  private joystickHandle!: Phaser.GameObjects.Ellipse;
  private joystickActive: boolean = false;
  private joystickBaseX: number = 0;
  private joystickBaseY: number = 0;
  private joystickRadius: number = 60;
  private joystickHandleRadius: number = 30;

  // Action buttons
  private attackButton!: Phaser.GameObjects.Ellipse;
  private jumpButton!: Phaser.GameObjects.Ellipse;
  private ultButton!: Phaser.GameObjects.Ellipse | null;
  private buttonRadius: number = 40;

  // Button labels
  private attackLabel!: Phaser.GameObjects.Text;
  private jumpLabel!: Phaser.GameObjects.Text;
  private ultLabel!: Phaser.GameObjects.Text | null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Store initial mobile state (for user agent check)
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    this.isMobile = isMobileUserAgent;
  }

  isMobileDevice(): boolean {
    // Check dynamically based on current screen size
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isSmallScreen = window.innerWidth < 768;
    // Consider it mobile if it's a mobile user agent OR small screen (for responsive design)
    return isMobileUserAgent || isSmallScreen;
  }

  createControls(width: number, height: number, hasUlt: boolean = false) {
    // Always create controls, but show/hide based on screen size

    const padding = 20;
    const joystickX = this.joystickRadius + padding;
    const joystickY = height - this.joystickRadius - padding;

    // Create joystick base
    this.joystickBase = this.scene.add
      .ellipse(
        joystickX,
        joystickY,
        this.joystickRadius * 2,
        this.joystickRadius * 2,
        0x333333,
        0.6
      )
      .setScrollFactor(0)
      .setDepth(20000)
      .setInteractive({ useHandCursor: false });

    // Create joystick handle
    this.joystickHandle = this.scene.add
      .ellipse(
        joystickX,
        joystickY,
        this.joystickHandleRadius * 2,
        this.joystickHandleRadius * 2,
        0x00ffcc,
        0.8
      )
      .setScrollFactor(0)
      .setDepth(20001)
      .setStrokeStyle(2, 0x00aacc);

    // Store base position
    this.joystickBaseX = joystickX;
    this.joystickBaseY = joystickY;

    // Joystick input handlers
    this.joystickBase.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.joystickActive = true;
      this.updateJoystick(pointer);
    });

    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive) {
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on("pointerup", () => {
      if (this.joystickActive) {
        this.joystickActive = false;
        this.joystickHandle.x = this.joystickBaseX;
        this.joystickHandle.y = this.joystickBaseY;
        this.virtualInput.moveX = 0;
        this.virtualInput.moveY = 0;
      }
    });

    // Action buttons (right side)
    const buttonY = height - this.buttonRadius - padding;
    const buttonSpacing = this.buttonRadius * 2.5;
    let buttonX = width - this.buttonRadius - padding;

    // Attack button (E)
    this.attackButton = this.scene.add
      .ellipse(buttonX, buttonY, this.buttonRadius * 2, this.buttonRadius * 2, 0xff0000, 0.8)
      .setScrollFactor(0)
      .setDepth(20000)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xcc0000);

    this.attackLabel = this.scene.add
      .text(buttonX, buttonY, "E", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);

    this.attackButton.on("pointerdown", () => {
      if (!this.virtualInput.attack) {
        this.virtualInput.attackJustPressed = true;
      }
      this.virtualInput.attack = true;
      this.attackButton.setAlpha(0.6);
    });

    this.attackButton.on("pointerup", () => {
      this.virtualInput.attack = false;
      this.attackButton.setAlpha(0.8);
    });

    // Jump button (Space)
    buttonX -= buttonSpacing;
    this.jumpButton = this.scene.add
      .ellipse(buttonX, buttonY, this.buttonRadius * 2, this.buttonRadius * 2, 0x00aaff, 0.8)
      .setScrollFactor(0)
      .setDepth(20000)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x0088cc);

    this.jumpLabel = this.scene.add
      .text(buttonX, buttonY, "⤴", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);

    this.jumpButton.on("pointerdown", () => {
      if (!this.virtualInput.jump) {
        this.virtualInput.jumpJustPressed = true;
      }
      this.virtualInput.jump = true;
      this.jumpButton.setAlpha(0.6);
    });

    this.jumpButton.on("pointerup", () => {
      this.virtualInput.jump = false;
      this.jumpButton.setAlpha(0.8);
    });

    // Ult button (Q) - only for goku
    if (hasUlt) {
      buttonX -= buttonSpacing;
      this.ultButton = this.scene.add
        .ellipse(buttonX, buttonY, this.buttonRadius * 2, this.buttonRadius * 2, 0x9d00ff, 0.8)
        .setScrollFactor(0)
        .setDepth(20000)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(3, 0x7a00cc);

      this.ultLabel = this.scene.add
        .text(buttonX, buttonY, "Q", {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "20px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(20001);

      this.ultButton.on("pointerdown", () => {
        if (!this.virtualInput.ult) {
          this.virtualInput.ultJustPressed = true;
        }
        this.virtualInput.ult = true;
        this.ultButton.setAlpha(0.6);
      });

      this.ultButton.on("pointerup", () => {
        this.virtualInput.ult = false;
        this.ultButton.setAlpha(0.8);
      });
    }

    // Initially set visibility based on screen size
    this.updateControlsVisibility();
  }

  updateControlsVisibility() {
    const shouldShow = this.isMobileDevice();
    if (this.joystickBase) this.joystickBase.setVisible(shouldShow);
    if (this.joystickHandle) this.joystickHandle.setVisible(shouldShow);
    if (this.attackButton) this.attackButton.setVisible(shouldShow);
    if (this.jumpButton) this.jumpButton.setVisible(shouldShow);
    if (this.attackLabel) this.attackLabel.setVisible(shouldShow);
    if (this.jumpLabel) this.jumpLabel.setVisible(shouldShow);
    if (this.ultButton) this.ultButton.setVisible(shouldShow);
    if (this.ultLabel) this.ultLabel.setVisible(shouldShow);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.joystickBaseX;
    const dy = pointer.y - this.joystickBaseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.joystickRadius) {
      // Clamp to circle
      const angle = Math.atan2(dy, dx);
      this.joystickHandle.x =
        this.joystickBaseX + Math.cos(angle) * this.joystickRadius;
      this.joystickHandle.y =
        this.joystickBaseY + Math.sin(angle) * this.joystickRadius;
      this.virtualInput.moveX = Math.cos(angle);
      this.virtualInput.moveY = Math.sin(angle);
    } else {
      // Normalize to -1 to 1 range
      this.joystickHandle.x = pointer.x;
      this.joystickHandle.y = pointer.y;
      this.virtualInput.moveX = dx / this.joystickRadius;
      this.virtualInput.moveY = dy / this.joystickRadius;
    }
  }

  getVirtualInput(): VirtualInput {
    return { ...this.virtualInput };
  }

  resetJustPressedFlags() {
    this.virtualInput.attackJustPressed = false;
    this.virtualInput.jumpJustPressed = false;
    this.virtualInput.ultJustPressed = false;
  }

  resetAttack() {
    this.virtualInput.attack = false;
    this.virtualInput.attackJustPressed = false;
  }

  resetJump() {
    this.virtualInput.jump = false;
    this.virtualInput.jumpJustPressed = false;
  }

  resetUlt() {
    this.virtualInput.ult = false;
    this.virtualInput.ultJustPressed = false;
  }

  hideControls() {
    if (!this.isMobile) return;
    if (this.joystickBase) this.joystickBase.setVisible(false);
    if (this.joystickHandle) this.joystickHandle.setVisible(false);
    if (this.attackButton) this.attackButton.setVisible(false);
    if (this.jumpButton) this.jumpButton.setVisible(false);
    if (this.attackLabel) this.attackLabel.setVisible(false);
    if (this.jumpLabel) this.jumpLabel.setVisible(false);
    if (this.ultButton) this.ultButton.setVisible(false);
    if (this.ultLabel) this.ultLabel.setVisible(false);
  }

  showControls() {
    if (!this.isMobile) return;
    if (this.joystickBase) this.joystickBase.setVisible(true);
    if (this.joystickHandle) this.joystickHandle.setVisible(true);
    if (this.attackButton) this.attackButton.setVisible(true);
    if (this.jumpButton) this.jumpButton.setVisible(true);
    if (this.attackLabel) this.attackLabel.setVisible(true);
    if (this.jumpLabel) this.jumpLabel.setVisible(true);
    if (this.ultButton) this.ultButton.setVisible(true);
    if (this.ultLabel) this.ultLabel.setVisible(true);
  }

  destroy() {
    if (this.joystickBase) this.joystickBase.destroy();
    if (this.joystickHandle) this.joystickHandle.destroy();
    if (this.attackButton) this.attackButton.destroy();
    if (this.jumpButton) this.jumpButton.destroy();
    if (this.attackLabel) this.attackLabel.destroy();
    if (this.jumpLabel) this.jumpLabel.destroy();
    if (this.ultButton) this.ultButton.destroy();
    if (this.ultLabel) this.ultLabel.destroy();
  }
}
