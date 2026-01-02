/**
 * Traversal Path Builder
 * 
 * Converts binary tree traversal algorithms into deterministic 3D spline paths.
 * This is the bridge between pure algorithm logic and physical ball motion.
 * 
 * CRITICAL: Path is computed BEFORE launch and is immutable during traversal.
 */

import { TreeNode3D, TraversalResult, TraversalType } from '@/types/pinball';
import * as THREE from 'three';

// ============================================================================
// WAYPOINT SYSTEM
// ============================================================================

export interface Waypoint3D {
  position: THREE.Vector3;
  nodeId: string;
  nodeValue: number;
  sequenceIndex: number;
  isNodeCenter: boolean; // True if waypoint IS the bumper, false if intermediate
  approachAngle: number; // For hit animation
}

export interface TraversalSpline {
  waypoints: Waypoint3D[];
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
  segmentLengths: number[]; // For progress tracking
}

// ============================================================================
// PATH BUILDER
// ============================================================================

export class TraversalPathBuilder {
  /**
   * Generate complete spline path for traversal
   * 
   * Flow:
   * 1. Get ordered nodes from traversal
   * 2. Create entry waypoint (launcher → first node)
   * 3. For each node pair, generate curved path
   * 4. Build smooth spline through all waypoints
   * 5. Return immutable spline
   */
  static buildSplinePath(
    traversal: TraversalResult,
    launcherPosition: THREE.Vector3,
    entryPoint: THREE.Vector3
  ): TraversalSpline {
    const waypoints: Waypoint3D[] = [];

    // PHASE 1: Launch trajectory (launcher → entry point)
    waypoints.push({
      position: launcherPosition.clone(),
      nodeId: 'launcher',
      nodeValue: -1,
      sequenceIndex: -1,
      isNodeCenter: false,
      approachAngle: 0
    });

    waypoints.push({
      position: entryPoint.clone(),
      nodeId: 'entry',
      nodeValue: -1,
      sequenceIndex: -1,
      isNodeCenter: false,
      approachAngle: 0
    });

    // PHASE 2: Traversal path through nodes
    for (let i = 0; i < traversal.steps.length; i++) {
      const step = traversal.steps[i];
      const nodePos = new THREE.Vector3(
        step.worldPosition.x,
        step.worldPosition.y,
        step.worldPosition.z
      );

      // Add approach waypoint (creates curve before hitting bumper)
      if (i > 0) {
        const prevStep = traversal.steps[i - 1];
        const prevPos = new THREE.Vector3(
          prevStep.worldPosition.x,
          prevStep.worldPosition.y,
          prevStep.worldPosition.z
        );

        // Calculate midpoint with curve
        const midpoint = this.calculateCurvedApproach(prevPos, nodePos, traversal.type);
        
        waypoints.push({
          position: midpoint,
          nodeId: `approach_${step.nodeId}`,
          nodeValue: step.value,
          sequenceIndex: i,
          isNodeCenter: false,
          approachAngle: this.calculateApproachAngle(prevPos, nodePos)
        });
      }

      // Add node center waypoint (bumper hit point)
      waypoints.push({
        position: nodePos,
        nodeId: step.nodeId,
        nodeValue: step.value,
        sequenceIndex: i,
        isNodeCenter: true,
        approachAngle: 0
      });
    }

    // PHASE 3: Build smooth spline
    const positions = waypoints.map(wp => wp.position);
    const curve = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.3);

    // Calculate segment lengths for progress tracking
    const segmentLengths = this.calculateSegmentLengths(curve, waypoints.length);

    return {
      waypoints,
      curve,
      totalLength: curve.getLength(),
      segmentLengths
    };
  }

  /**
   * Calculate curved approach point between two nodes
   * Creates natural pinball trajectory (not straight lines)
   */
  private static calculateCurvedApproach(
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    traversalType: TraversalType
  ): THREE.Vector3 {
    const midpoint = new THREE.Vector3()
      .addVectors(fromPos, toPos)
      .multiplyScalar(0.5);

    // Add curve based on traversal type
    switch (traversalType) {
      case 'preorder':
        // Cascade downward with left/right lean
        if (toPos.x < fromPos.x) {
          midpoint.x -= 0.8; // Left lean
        } else {
          midpoint.x += 0.8; // Right lean
        }
        midpoint.y -= 1.2; // Gravity drop
        break;

      case 'inorder':
        // Sweep horizontally
        midpoint.y -= 0.5; // Slight drop
        if (toPos.x < fromPos.x) {
          midpoint.x -= 1.5; // Exaggerate left sweep
        } else if (toPos.x > fromPos.x) {
          midpoint.x += 1.5; // Exaggerate right sweep
        }
        break;

      case 'postorder':
        // Climb upward with bounce
        midpoint.y += 0.8; // Upward arc
        if (toPos.x < fromPos.x) {
          midpoint.x -= 0.5;
        } else {
          midpoint.x += 0.5;
        }
        break;
    }

    return midpoint;
  }

  /**
   * Calculate approach angle for hit animation
   */
  private static calculateApproachAngle(
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3
  ): number {
    const direction = new THREE.Vector3()
      .subVectors(toPos, fromPos)
      .normalize();
    
    return Math.atan2(direction.y, direction.x);
  }

  /**
   * Calculate segment lengths along curve for progress tracking
   */
  private static calculateSegmentLengths(
    curve: THREE.CatmullRomCurve3,
    segmentCount: number
  ): number[] {
    const lengths: number[] = [];
    const points = curve.getPoints(segmentCount * 10); // High resolution

    for (let i = 1; i < points.length; i++) {
      const distance = points[i - 1].distanceTo(points[i]);
      lengths.push(distance);
    }

    return lengths;
  }

  /**
   * Get position along spline at normalized t (0 to 1)
   */
  static getPositionAt(spline: TraversalSpline, t: number): THREE.Vector3 {
    return spline.curve.getPointAt(Math.max(0, Math.min(1, t)));
  }

  /**
   * Get current waypoint index based on progress
   */
  static getCurrentWaypointIndex(spline: TraversalSpline, t: number): number {
    const targetDistance = t * spline.totalLength;
    let accumulatedDistance = 0;

    for (let i = 0; i < spline.segmentLengths.length; i++) {
      accumulatedDistance += spline.segmentLengths[i];
      if (accumulatedDistance >= targetDistance) {
        return Math.min(i, spline.waypoints.length - 1);
      }
    }

    return spline.waypoints.length - 1;
  }

  /**
   * Check if ball is at a node center (for hit detection)
   */
  static isAtNodeCenter(spline: TraversalSpline, t: number, threshold: number = 0.02): {
    isAtNode: boolean;
    waypoint: Waypoint3D | null;
  } {
    const currentIndex = this.getCurrentWaypointIndex(spline, t);
    const waypoint = spline.waypoints[currentIndex];

    if (waypoint && waypoint.isNodeCenter) {
      const currentPos = this.getPositionAt(spline, t);
      const distance = currentPos.distanceTo(waypoint.position);

      if (distance < threshold) {
        return { isAtNode: true, waypoint };
      }
    }

    return { isAtNode: false, waypoint: null };
  }
}
