/**
 * Plunger Controller - Arcade Pinball Launcher Mechanism
 * 
 * Handles spring-loaded plunger physics simulation:
 * - IDLE: Resting at home position
 * - PULLING: Player dragging downward (charging)
 * - CHARGED: Maximum pull, ready to release
 * - RELEASED: Spring releases, transfers momentum to ball
 * - RESET: Returns to home position
 * 
 * This is a DETERMINISTIC system - no randomness.
 * Launch velocity is directly calculated from pull distance.
 */

export enum PlungerState {
  IDLE = 'IDLE',
  PULLING = 'PULLING',
  CHARGED = 'CHARGED',
  RELEASED = 'RELEASED',
  RESET = 'RESET'
}

export interface PlungerConfig {
  maxPullDistance: number; // Maximum pull in world units
  minLaunchForce: number; // Minimum force required to launch
  maxLaunchForce: number; // Maximum launch velocity
  springConstant: number; // How much force per unit pull
  resetSpeed: number; // How fast plunger returns to home
}

export const DEFAULT_PLUNGER_CONFIG: PlungerConfig = {
  maxPullDistance: 3.0,
  minLaunchForce: 0.1,
  maxLaunchForce: 1.0,
  springConstant: 0.333, // 1/3 pull = full force
  resetSpeed: 2.0
};

export interface PlungerData {
  state: PlungerState;
  pullDistance: number; // Current pull (0 to maxPullDistance)
  chargePercent: number; // 0 to 1
  launchForce: number; // Calculated force to apply to ball
  position: { x: number; y: number; z: number }; // Current plunger position
}

/**
 * Plunger Controller Class
 * Manages state machine and force calculations
 */
export class PlungerController {
  private config: PlungerConfig;
  private data: PlungerData;
  private homePosition: { x: number; y: number; z: number };
  private dragStartY: number = 0;

  constructor(
    homePosition: { x: number; y: number; z: number },
    config: PlungerConfig = DEFAULT_PLUNGER_CONFIG
  ) {
    this.config = config;
    this.homePosition = { ...homePosition };
    this.data = {
      state: PlungerState.IDLE,
      pullDistance: 0,
      chargePercent: 0,
      launchForce: 0,
      position: { ...homePosition }
    };
  }

  /**
   * Start pulling the plunger (user begins drag)
   */
  startPull(startY: number): void {
    if (this.data.state !== PlungerState.IDLE && this.data.state !== PlungerState.RESET) {
      return;
    }

    this.data.state = PlungerState.PULLING;
    this.dragStartY = startY;
    console.log('🎯 Plunger: Started pulling');
  }

  /**
   * Update pull distance during drag (user is dragging)
   */
  updatePull(currentY: number): void {
    if (this.data.state !== PlungerState.PULLING) {
      return;
    }

    // Calculate pull distance (positive = pulled back)
    // In screen space, dragging down = positive deltaY
    const screenDelta = currentY - this.dragStartY;
    
    // Convert screen pixels to world units (tuned for feel)
    const worldDelta = screenDelta / 100; // 100 pixels = 1 world unit
    
    // Clamp to valid range
    this.data.pullDistance = Math.max(0, Math.min(worldDelta, this.config.maxPullDistance));
    
    // Calculate charge percent
    this.data.chargePercent = this.data.pullDistance / this.config.maxPullDistance;
    
    // Check if fully charged
    if (this.data.pullDistance >= this.config.maxPullDistance) {
      this.data.state = PlungerState.CHARGED;
    }

    // Update visual position (pull down = negative Y in world space)
    this.data.position.y = this.homePosition.y - this.data.pullDistance;

    console.log('🔋 Plunger: Pulling', {
      screenDelta,
      worldDelta,
      pullDistance: this.data.pullDistance.toFixed(2),
      charge: (this.data.chargePercent * 100).toFixed(0) + '%'
    });
  }

  /**
   * Release the plunger (user releases drag)
   * Calculates launch force and triggers launch
   */
  releasePull(): { shouldLaunch: boolean; force: number } {
    if (this.data.state !== PlungerState.PULLING && this.data.state !== PlungerState.CHARGED) {
      return { shouldLaunch: false, force: 0 };
    }

    // Calculate launch force based on pull distance
    // F = k * x (Hooke's Law approximation)
    const rawForce = this.data.pullDistance * this.config.springConstant;
    
    // Normalize to 0-1 range
    this.data.launchForce = Math.min(rawForce / this.config.maxPullDistance, this.config.maxLaunchForce);

    console.log('🚀 Plunger: Released!', {
      pullDistance: this.data.pullDistance.toFixed(2),
      rawForce: rawForce.toFixed(2),
      launchForce: this.data.launchForce.toFixed(2),
      willLaunch: this.data.launchForce >= this.config.minLaunchForce
    });

    // Check if enough force to launch
    if (this.data.launchForce < this.config.minLaunchForce) {
      console.log('⚠️ Plunger: Not enough charge to launch');
      this.reset();
      return { shouldLaunch: false, force: 0 };
    }

    // Transition to released state
    this.data.state = PlungerState.RELEASED;

    return {
      shouldLaunch: true,
      force: this.data.launchForce
    };
  }

  /**
   * Update plunger position during reset animation
   * Call this every frame after launch
   */
  updateReset(deltaTime: number): boolean {
    if (this.data.state !== PlungerState.RELEASED && this.data.state !== PlungerState.RESET) {
      return false;
    }

    this.data.state = PlungerState.RESET;

    // Move plunger back to home position
    const resetDistance = this.config.resetSpeed * deltaTime;
    const targetY = this.homePosition.y;
    
    if (this.data.position.y < targetY) {
      this.data.position.y = Math.min(this.data.position.y + resetDistance, targetY);
    } else {
      this.data.position.y = Math.max(this.data.position.y - resetDistance, targetY);
    }

    // Check if reset complete
    const isComplete = Math.abs(this.data.position.y - targetY) < 0.01;
    
    if (isComplete) {
      this.data.position.y = targetY;
      this.data.state = PlungerState.IDLE;
      this.data.pullDistance = 0;
      this.data.chargePercent = 0;
      this.data.launchForce = 0;
      console.log('✅ Plunger: Reset complete');
      return true;
    }

    return false;
  }

  /**
   * Force reset to idle state
   */
  reset(): void {
    this.data.state = PlungerState.IDLE;
    this.data.pullDistance = 0;
    this.data.chargePercent = 0;
    this.data.launchForce = 0;
    this.data.position = { ...this.homePosition };
  }

  /**
   * Get current plunger data (read-only)
   */
  getData(): Readonly<PlungerData> {
    return { ...this.data };
  }

  /**
   * Check if plunger is ready to accept new pull
   */
  isIdle(): boolean {
    return this.data.state === PlungerState.IDLE;
  }

  /**
   * Check if plunger is currently being pulled
   */
  isPulling(): boolean {
    return this.data.state === PlungerState.PULLING || this.data.state === PlungerState.CHARGED;
  }
}
