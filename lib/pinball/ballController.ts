/**
 * Ball Controller - Rail-Locked Pinball Motion
 * 
 * Controls ball movement along predetermined traversal spline.
 * Ball CANNOT deviate from path - this is deterministic, not physics-based.
 * 
 * State Machine:
 * - WAITING: At launcher, ready to launch
 * - LAUNCHING: Accelerating from launcher to entry point
 * - TRAVERSING: Following node-to-node spline
 * - COMPLETE: Reached end of traversal
 */

import { TraversalSpline, Waypoint3D, TraversalPathBuilder } from './traversalPathBuilder';
import * as THREE from 'three';

// ============================================================================
// BALL STATE
// ============================================================================

export enum BallState {
  WAITING = 'WAITING',
  LAUNCHING = 'LAUNCHING',
  TRAVERSING = 'TRAVERSING',
  COMPLETE = 'COMPLETE'
}

export interface BallData {
  state: BallState;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  splineProgress: number; // 0 to 1 along entire spline
  speed: number; // Units per second
  currentWaypointIndex: number;
  lastHitNodeId: string | null;
}

// ============================================================================
// BALL CONTROLLER
// ============================================================================

export class BallController {
  private data: BallData;
  private spline: TraversalSpline | null = null;
  private launchForce: number = 0;
  private onNodeHit: ((waypoint: Waypoint3D) => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor(startPosition: THREE.Vector3) {
    this.data = {
      state: BallState.WAITING,
      position: startPosition.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      splineProgress: 0,
      speed: 0,
      currentWaypointIndex: 0,
      lastHitNodeId: null
    };
  }

  /**
   * Initialize with traversal spline
   */
  setSpline(
    spline: TraversalSpline,
    onNodeHit?: (waypoint: Waypoint3D) => void,
    onComplete?: () => void
  ): void {
    this.spline = spline;
    this.onNodeHit = onNodeHit || null;
    this.onComplete = onComplete || null;
    this.data.state = BallState.WAITING;
    this.data.splineProgress = 0;
    this.data.currentWaypointIndex = 0;
    this.data.lastHitNodeId = null;
  }

  /**
   * Launch ball with given force (0 to 1)
   */
  launch(force: number): void {
    if (this.data.state !== BallState.WAITING || !this.spline) {
      console.warn('Cannot launch: not in waiting state or no spline');
      return;
    }

    this.launchForce = Math.max(0.3, Math.min(1.0, force));
    this.data.state = BallState.LAUNCHING;
    
    // Launch speed formula: base speed * (1 + force)
    this.data.speed = 8 * (1 + this.launchForce);

    console.log('🚀 Ball launched with force:', this.launchForce, 'speed:', this.data.speed);
  }

  /**
   * Update ball position (call every frame)
   */
  update(deltaTime: number): void {
    if (!this.spline) return;

    switch (this.data.state) {
      case BallState.LAUNCHING:
        this.updateLaunching(deltaTime);
        break;

      case BallState.TRAVERSING:
        this.updateTraversing(deltaTime);
        break;

      case BallState.WAITING:
      case BallState.COMPLETE:
        // No update needed
        break;
    }
  }

  /**
   * Update during launch phase
   */
  private updateLaunching(deltaTime: number): void {
    if (!this.spline) return;

    // Fast acceleration during launch
    const launchSpeed = this.data.speed * 1.5;
    const progressDelta = (launchSpeed / this.spline.totalLength) * deltaTime;
    
    this.data.splineProgress += progressDelta;

    // Check if launch complete (reached entry point)
    const entryWaypointIndex = 1; // Index 0 is launcher, 1 is entry
    if (this.data.currentWaypointIndex >= entryWaypointIndex) {
      this.data.state = BallState.TRAVERSING;
      this.data.speed = 12; // Normal traversal speed
      console.log('✅ Launch complete, entering traversal');
    }

    this.updatePosition();
  }

  /**
   * Update during traversal phase
   */
  private updateTraversing(deltaTime: number): void {
    if (!this.spline) return;

    // Progress along spline
    const progressDelta = (this.data.speed / this.spline.totalLength) * deltaTime;
    this.data.splineProgress += progressDelta;

    // Clamp to valid range
    if (this.data.splineProgress >= 1.0) {
      this.data.splineProgress = 1.0;
      this.data.state = BallState.COMPLETE;
      
      if (this.onComplete) {
        this.onComplete();
      }
      
      console.log('🏁 Traversal complete');
      return;
    }

    this.updatePosition();
    this.checkNodeHit();
  }

  /**
   * Update ball position based on spline progress
   */
  private updatePosition(): void {
    if (!this.spline) return;

    this.data.position = TraversalPathBuilder.getPositionAt(
      this.spline,
      this.data.splineProgress
    );

    this.data.currentWaypointIndex = TraversalPathBuilder.getCurrentWaypointIndex(
      this.spline,
      this.data.splineProgress
    );

    // Calculate velocity direction (for rotation)
    if (this.data.splineProgress < 0.99) {
      const nextPos = TraversalPathBuilder.getPositionAt(
        this.spline,
        this.data.splineProgress + 0.01
      );
      
      this.data.velocity.subVectors(nextPos, this.data.position).normalize();
    }
  }

  /**
   * Check if ball has hit a node bumper
   */
  private checkNodeHit(): void {
    if (!this.spline) return;

    const hitCheck = TraversalPathBuilder.isAtNodeCenter(
      this.spline,
      this.data.splineProgress,
      1.5 // Hit threshold (bumper radius)
    );

    if (hitCheck.isAtNode && hitCheck.waypoint) {
      // Only trigger hit once per node
      if (hitCheck.waypoint.nodeId !== this.data.lastHitNodeId) {
        this.data.lastHitNodeId = hitCheck.waypoint.nodeId;
        
        if (this.onNodeHit) {
          this.onNodeHit(hitCheck.waypoint);
        }

        console.log('💥 Hit node:', hitCheck.waypoint.nodeValue, 'at sequence:', hitCheck.waypoint.sequenceIndex);
      }
    }
  }

  /**
   * Get current ball data (read-only)
   */
  getData(): Readonly<BallData> {
    return { ...this.data };
  }

  /**
   * Get current position
   */
  getPosition(): THREE.Vector3 {
    return this.data.position.clone();
  }

  /**
   * Get current velocity
   */
  getVelocity(): THREE.Vector3 {
    return this.data.velocity.clone();
  }

  /**
   * Check if ball is currently moving
   */
  isMoving(): boolean {
    return this.data.state === BallState.LAUNCHING || this.data.state === BallState.TRAVERSING;
  }

  /**
   * Check if traversal is complete
   */
  isComplete(): boolean {
    return this.data.state === BallState.COMPLETE;
  }

  /**
   * Reset to waiting state
   */
  reset(startPosition: THREE.Vector3): void {
    this.data = {
      state: BallState.WAITING,
      position: startPosition.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      splineProgress: 0,
      speed: 0,
      currentWaypointIndex: 0,
      lastHitNodeId: null
    };
    
    this.launchForce = 0;
  }
}
