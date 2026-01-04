import type { MapLayer } from "./types";

export class MapRenderer {
  private scene: Phaser.Scene;
  private mapScale: number;
  private wallColliders: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    scene: Phaser.Scene,
    mapScale: number,
    wallColliders: Phaser.Physics.Arcade.StaticGroup
  ) {
    this.scene = scene;
    this.mapScale = mapScale;
    this.wallColliders = wallColliders;
  }

  /**
   * Renders a single tile with optional collision
   */
  private renderTile(
    tile: { x: number; y: number; id: string },
    tileSize: number,
    depth: number,
    layerName: string,
    hasCollider: boolean
  ): { tileRendered: boolean; colliderCreated: boolean } {
    const x = tile.x * tileSize * this.mapScale;
    const y = tile.y * tileSize * this.mapScale;
    const tileId = parseInt(tile.id, 10);

    if (isNaN(tileId)) {
      console.warn(`Invalid tile ID: ${tile.id} at (${tile.x}, ${tile.y})`);
      return { tileRendered: false, colliderCreated: false };
    }

    const tileSprite = this.scene.add.sprite(x, y, "tiles", tileId);
    tileSprite.setOrigin(0, 0);
    tileSprite.setScale(this.mapScale);
    tileSprite.setDepth(depth);

    let colliderCreated = false;
    if (hasCollider && layerName !== "nodes") {
      const collider = this.scene.add.rectangle(
        x + (tileSize * this.mapScale) / 2,
        y + (tileSize * this.mapScale) / 2,
        tileSize * this.mapScale,
        tileSize * this.mapScale,
        0xff0000,
        0
      );

      this.scene.physics.add.existing(collider, true);
      const body = collider.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      collider.setVisible(false);
      this.wallColliders.add(collider);
      colliderCreated = true;
    }

    return { tileRendered: true, colliderCreated };
  }

  /**
   * Renders all layers from the map data
   */
  renderLayers(
    mapData: {
      tileSize: number;
      layers: MapLayer[];
    },
    layerRenderOrder: string[],
    depthPerLayer: number = 10
  ): { totalTiles: number; totalColliders: number } {
    const layerMap = new Map<string, MapLayer>();
    mapData.layers.forEach((layer) => {
      layerMap.set(layer.name, layer);
    });

    let totalTiles = 0;
    let totalColliders = 0;
    const renderedLayers = new Set<string>();

    // Render layers in predefined order
    layerRenderOrder.forEach((layerName, renderIndex) => {
      const layer = layerMap.get(layerName);
      if (!layer) {
        console.warn(`Layer "${layerName}" not found in map data`);
        return;
      }

      renderedLayers.add(layerName);
      console.log(
        `Rendering layer ${renderIndex}: ${layer.name}, tiles: ${layer.tiles.length}, collider: ${layer.collider}`
      );

      layer.tiles.forEach((tile) => {
        const result = this.renderTile(
          tile,
          mapData.tileSize,
          renderIndex * depthPerLayer,
          layer.name,
          layer.collider === true
        );
        if (result.tileRendered) totalTiles++;
        if (result.colliderCreated) totalColliders++;
      });
    });

    // Render remaining layers not in predefined order
    const defaultDepth = layerRenderOrder.length * depthPerLayer;
    mapData.layers.forEach((layer) => {
      if (renderedLayers.has(layer.name)) return;
      if (!layer.tiles || layer.tiles.length === 0) return;

      console.log(
        `Rendering additional layer: ${layer.name}, tiles: ${layer.tiles.length}, collider: ${layer.collider}`
      );

      layer.tiles.forEach((tile) => {
        const result = this.renderTile(
          tile,
          mapData.tileSize,
          defaultDepth,
          layer.name,
          layer.collider === true
        );
        if (result.tileRendered) totalTiles++;
        if (result.colliderCreated) totalColliders++;
      });
    });

    console.log(`Total tiles rendered: ${totalTiles}`);
    console.log(`Total wall colliders created: ${totalColliders}`);
    console.log(`Wall colliders in group: ${this.wallColliders.getLength()}`);

    return { totalTiles, totalColliders };
  }

  /**
   * Converts tile coordinates to world coordinates
   */
  static tileToWorld(
    tileX: number,
    tileY: number,
    tileSize: number,
    mapScale: number
  ): { x: number; y: number } {
    return {
      x: (tileX + 0.5) * tileSize * mapScale,
      y: (tileY + 0.5) * tileSize * mapScale,
    };
  }

  /**
   * Converts world coordinates to tile coordinates
   */
  static worldToTile(
    worldX: number,
    worldY: number,
    tileSize: number,
    mapScale: number
  ): { tileX: number; tileY: number } {
    return {
      tileX: Math.floor(worldX / (tileSize * mapScale)),
      tileY: Math.floor(worldY / (tileSize * mapScale)),
    };
  }
}
