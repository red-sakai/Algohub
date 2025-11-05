declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  import { Loader, Group, AnimationClip, Camera } from "three";

  export interface GLTF {
    animations: AnimationClip[];
    scene: Group;
    scenes: Group[];
    cameras: Camera[];
    asset: unknown;
    parser: unknown;
    userData: Record<string, unknown>;
  }

  export class GLTFLoader extends Loader<GLTF> {}
}
