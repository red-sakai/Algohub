/// <reference types="react" />
/// <reference types="three" />

declare module '@react-three/fiber' {
  import * as React from 'react';
  import * as THREE from 'three';

  export interface ThreeElements {
    // Lights
    ambientLight: any;
    directionalLight: any;
    pointLight: any;
    spotLight: any;
    hemisphereLight: any;

    // Objects
    mesh: any;
    group: any;
    line: any;
    points: any;

    // Geometries
    boxGeometry: any;
    sphereGeometry: any;
    planeGeometry: any;
    cylinderGeometry: any;
    coneGeometry: any;
    bufferGeometry: any;

    // Materials
    meshBasicMaterial: any;
    meshStandardMaterial: any;
    meshPhysicalMaterial: any;
    lineBasicMaterial: any;
    pointsMaterial: any;

    // Helpers
    gridHelper: any;
    axesHelper: any;
    
    // Attributes
    bufferAttribute: any;
  }

  declare global {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }

  export interface CanvasProps {
    children?: React.ReactNode;
    shadows?: boolean;
    [key: string]: any;
  }

  export function Canvas(props: CanvasProps): JSX.Element;

  export interface ThreeContext {
    camera: THREE.Camera;
    scene: THREE.Scene;
    gl: THREE.WebGLRenderer;
    [key: string]: any;
  }

  export function useThree(): ThreeContext;
  export function useFrame(callback: (state: ThreeContext, delta: number) => void): void;
}

declare module '@react-three/drei' {
  import * as React from 'react';

  export interface OrbitControlsProps {
    enablePan?: boolean;
    enableZoom?: boolean;
    enableRotate?: boolean;
    minDistance?: number;
    maxDistance?: number;
    [key: string]: any;
  }

  export function OrbitControls(props: OrbitControlsProps): JSX.Element;
  export function PerspectiveCamera(props: any): JSX.Element;
  export function Environment(props: any): JSX.Element;
  export function Sphere(props: any): JSX.Element;
  export function Html(props: any): JSX.Element;
  export function Sky(props: any): JSX.Element;
  export function Stars(props: any): JSX.Element;
}
