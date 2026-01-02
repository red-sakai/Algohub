/**
 * Pinball Animation Controller - ARCADE EDITION
 * 
 * Manages pinball state and movement through traversal sequence.
 * Uses spline-based rail system for deterministic motion.
 * 
 * ARCHITECTURE:
 * - PlungerController: Launch mechanics
 * - TraversalPathBuilder: Algorithm → spline conversion
 * - BallController: Rail-locked movement
 */

import { PinballState, TraversalResult, TraversalStep, TRAVERSAL_CONFIGS } from '@/types/pinball';
import { PlungerController } from './plungerController';
import { TraversalPathBuilder, TraversalSpline, Waypoint3D } from './traversalPathBuilder';
import { BallController, BallState } from './ballController';
import * as THREE from 'three';

// ============================================================================
// ANIMATION STATE MACHINE
// ============================================================================

export class PinballAnimator {
  private pinballState: PinballState;
  private traversal: TraversalResult | null = null;
  private plungerController: PlungerController | null = null;
  private ballController: BallController | null = null;
  private spline: TraversalSpline | null = null;
  private onNodeHit: ((step: TraversalStep) => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor() {
    this.pinballState = {
      currentPosition: { x: 0, y: 0, z: 0 },
      targetNodeIndex: 0,
      isMoving: false,
      progress: 0,
      launcherCharge: 0,
      isLaunched: false,
      isLaunching: false
    };
    
    this.ballController = new BallController(new THREE.Vector3(0, 0, 0));
  }

  /**Builds spline path and sets up controllers
   */
  startTraversal(
    traversal: TraversalResult,
    onNodeHit?: (step: TraversalStep) => void,
    onComplete?: () => void
  ): void {
    this.traversal = traversal;
    this.onNodeHit = onNodeHit || null;
    this.onComplete = onComplete || null;

    if (traversal.steps.length === 0) {
      return;
    }

    // Get launcher position for this traversal type
    const config = TRAVERSAL_CONFIGS[traversal.type];
    const launcherPos = new THREE.Vector3(
      config.launcherPosition.x,
      config.launcherPosition.y,
      config.launcherPosition.z
    );
    const entryPos = new THREE.Vector3(
      config.entryPoint.x,
      config.entryPoint.y,
      config.entryPoint.z
    );

    // Build spline path from traversal
    this.spline = TraversalPathBuilder.buildSplinePath(
      traversal,
      launcherPos,
      entryPos
    );

    console.log('✅ Spline built:', this.spline.waypoints.length, 'waypoints, length:', this.spline.totalLength);

    // Initialize controllers
    this.plungerController = new PlungerController(config.launcherPosition);
    
    if (this.ballController) {
      this.ballController.setSpline(
        this.spline,
        (waypoint: Waypoint3D) => this.handleWaypointHit(waypoint),
        () => this.handleTraversalComplete()
      );
    }

    // Update state
    this.pinballState.currentPosition = config.launcherPosition;
    this.pinballState.targetNodeIndex = 0;
    this.pinballState.isMoving = false;
    this.pinballState.isLaunched = false;
    this.pinballState.isLaunching = false;
    this.pinballState.launcherCharge = 0;
    this.plungerController = new PlungerController(config.launcherPosition);
    console.log('✅ Plunger initialized at', config.launcherPosition);
  }

  /**
   * Start charging launcher (user pressed mouse)
   */
  startChargingLauncher(startY: number): void {
    if (!this.plungerController) return;
    this.plungerController.startPull(startY);
  }

  /**
   * Update plunger pull amount (user dragging)
   */
  updatePlungerPull(currentY: number): void {
    if (!this.plungerController) return;
    this.plungerController.updatePull(currentY);
    const data = this.plungerController.getData();
    this.pinballState.launcherCharge = data ? data.chargePercent : 0;
  }

  /**
   * Launch ball (triggered when plunger is released)
   */
  launchBall(): void {
    if (!this.plungerController || !this.ballController || !this.spline) {
      console.log('⚠️ Cannot launch - missing controllers or spline');
      return;
    }

    const result = this.plungerController.releasePull();
    
    if (!result.shouldLaunch) {
      console.log('❌ Launch cancelled - insufficient charge');
      return;
    }

    console.log('🚀 LAUNCHING with force:', result.force);

    // Launch ball controller
    this.ballController.launch(result.force);
    
    // Update state
    this.pinballState.isLaunching = true;
    this.pinballState.isMoving = true;
    this.pinballState.isLaunched = true;
    this.pinballState.launcherCharge = result.force;
    
    console.log('✅ Ball launched on spline rail');
  }

  /**
   * Handle waypoint hit (called by ball controller)
   */
  private handleWaypointHit(waypoint: Waypoint3D): void {
    if (!this.traversal || !waypoint.isNodeCenter) return;

    // Find matching traversal step
    const step = this.traversal.steps[waypoint.sequenceIndex];
    if (step && this.onNodeHit) {
      this.onNodeHit(step);
    }

    this.pinballState.targetNodeIndex = waypoint.sequenceIndex;
    console.log('💥 Node hit:', waypoint.nodeValue, 'sequence:', waypoint.sequenceIndex);
  }

  /**
   * Handle traversal completion (called by ball controller)
   */
  private handleTraversalComplete(): void {
    this.pinballState.isMoving = false;
    this.pinballState.isLaunching = false;
    
    if (this.onComplete) {
      this.onComplete();
    }

    console.log('🏁 Traversal complete!');
  }

  /**
   * Update animation (call every frame)
   * Returns current pinball position
   */
  update(deltaTime: number): { x: number; y: number; z: number } {
    // Update plunger reset animation if active
    if (this.plungerController) {
      this.plungerController.updateReset(deltaTime);
    }

    if (!this.pinballState.isMoving || !this.traversal) {
      return this.pinballState.currentPosition;
    }

    // Update ball controller
    if (this.ballController) {
      this.ballController.update(deltaTime);
      
      // Get current position from ball controller
      const ballPos = this.ballController.getPosition();
      this.pinballState.currentPosition = {
        x: ballPos.x,
        y: ballPos.y,
        z: ballPos.z
      };

      // Update state flags
      this.pinballState.isMoving = this.ballController.isMoving();
      
      if (this.ballController.isComplete()) {
        this.pinballState.isLaunching = false;
      }

      // Update progress
      if (this.traversal) {
        const ballData = this.ballController.getData();
        this.pinballState.progress = ballData.splineProgress;
      }
    }

    return this.pinballState.currentPosition;
  }

  /**
   * Pause animation
   */
  pause(): void {
    this.pinballState.isMoving = false;
  }

  /**
   * Resume animation
   */
  resume(): void {
    if (this.traversal && !this.ballController?.isComplete()) {
      this.pinballState.isMoving = true;
    }
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<PinballState> {
    return { ...this.pinballState };
  }

  /**
   * Check if animation is complete
   */
  isComplete(): boolean {
    return !this.pinballState.isMoving && (this.ballController?.isComplete() || false);
  }

  /**
   * Get current target step
   */
  getCurrentStep(): TraversalStep | null {
    if (!this.traversal || this.pinballState.targetNodeIndex >= this.traversal.steps.length) {
      return null;
    }
    return this.traversal.steps[this.pinballState.targetNodeIndex];
  }

  /**
   * Get all steps that have been visited
   */
  getVisitedSteps(): TraversalStep[] {
    if (!this.traversal) return [];
    return this.traversal.steps.slice(0, this.pinballState.targetNodeIndex);
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.pinballState.targetNodeIndex = 0;
    this.pinballState.isLaunched = false;
    this.pinballState.isLaunching = false;
    this.pinballState.launcherCharge = 0;
    
    if (this.traversal) {
      const config = TRAVERSAL_CONFIGS[this.traversal.type];
      this.pinballState.currentPosition = config.launcherPosition;
      this.pinballState.isMoving = false;
      
      // Reset controllers
      if (this.plungerController) {
        this.plungerController.reset();
      }
      
      if (this.ballController) {
        const launcherPos = new THREE.Vector3(
          config.launcherPosition.x,
          config.launcherPosition.y,
          config.launcherPosition.z
        );
        this.ballController.reset(launcherPos);
      }
    }
  }

  /**
   * Get plunger data for rendering
   */
  getPlungerData() {
    return this.plungerController?.getData() || null;
  }

  /**
   * Get spline for rendering
   */
  getSpline(): TraversalSpline | null {
    return this.spline;
  }

  /**
   * Get ball controller for direct access
   */
  getBallController(): BallController | null {
    return this.ballController;
  }
}

// ============================================================================
// VISUAL STATE MANAGER (for node glow/color animations)
// ============================================================================

interface NodeVisualState {
  isActive: boolean;
  wasVisited: boolean;
  visitOrder: number | null;
  glowIntensity: number;
  lastHitTime: number;
}

export class NodeVisualStateManager {
  private states: Map<string, NodeVisualState> = new Map();

  /**
   * Initialize states for all nodes
   */
  initializeNodes(nodeIds: string[]): void {
    this.states.clear();
    for (const nodeId of nodeIds) {
      this.states.set(nodeId, {
        isActive: false,
        wasVisited: false,
        visitOrder: null,
        glowIntensity: 0,
        lastHitTime: 0
      });
    }
  }

  /**
   * Mark node as hit by pinball
   */
  hitNode(nodeId: string, sequenceIndex: number): void {
    const state = this.states.get(nodeId);
    if (!state) return;

    state.isActive = true;
    state.wasVisited = true;
    state.visitOrder = sequenceIndex;
    state.glowIntensity = 1.0;
    state.lastHitTime = Date.now();
  }

  /**
   * Update glow fade for all nodes
   */
  update(deltaTime: number): void {
    const currentTime = Date.now();
    for (const [nodeId, state] of this.states.entries()) {
      if (state.isActive) {
        // Fade glow over 1 second
        const timeSinceHit = (currentTime - state.lastHitTime) / 1000;
        state.glowIntensity = Math.max(0, 1 - timeSinceHit);
        
        if (state.glowIntensity === 0) {
          state.isActive = false;
        }
      }
    }
  }

  /**
   * Get state for specific node
   */
  getNodeState(nodeId: string) {
    return this.states.get(nodeId);
  }

  /**
   * Reset all states
   */
  reset(): void {
    for (const state of this.states.values()) {
      state.isActive = false;
      state.wasVisited = false;
      state.visitOrder = null;
      state.glowIntensity = 0;
      state.lastHitTime = 0;
    }
  }
}
