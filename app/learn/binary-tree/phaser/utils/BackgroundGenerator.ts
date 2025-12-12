import * as Phaser from 'phaser';

export class BackgroundGenerator {
    static createBackground(scene: Phaser.Scene) {
        // Create full screen texture
        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;

        // 1. SKY GRADIENT (Magic Sky - Pink/Purple)
        const sky = scene.make.graphics({});
        // Pink to light blue/purple
        sky.fillGradientStyle(0xffa5b0, 0xffa5b0, 0xc1dbf5, 0xc1dbf5, 1);
        sky.fillRect(0, 0, width, height);
        sky.generateTexture('sky-bg', width, height);
        sky.destroy();

        // 2. ECLIPSE / DARK SUN
        const sun = scene.make.graphics({});
        sun.fillStyle(0x2d1b2e, 1); // Dark void color
        sun.fillCircle(width * 0.5, height * 0.4, 150); // Large
        // Ring
        sun.lineStyle(4, 0xff9a8b, 0.8);
        sun.strokeCircle(width * 0.5, height * 0.4, 152);
        sun.generateTexture('bg-sun', 320, 320);
        sun.destroy();

        // 3. MOUNTAINS (Distant Purple Clouds/Mountains)
        this.createMountainLayer(scene, 'mountains-back', width, height * 0.6, 0x6a4c93, 50);

        // 4. GRASSY FIELD (Checkerboard pattern)
        this.createGrassField(scene, 'grass-field', width, height * 0.4); // Bottom 40%

        // 5. CLOUDS (Pixel style)
        this.createCloudTexture(scene, 'cloud-1', 120, 60);
    }

    private static createGrassField(scene: Phaser.Scene, key: string, width: number, height: number) {
        const graphics = scene.make.graphics({});
        const color1 = 0x4ade80; // Light green
        const color2 = 0x22c55e; // Darker green
        const checkSize = 40;

        graphics.fillStyle(color1, 1);
        graphics.fillRect(0, 0, width, height);

        graphics.fillStyle(color2, 1);
        for (let y = 0; y < height; y += checkSize) {
            // Row offset for checkerboard
            const offset = (Math.floor(y / checkSize) % 2) * (checkSize / 2);
            for (let x = -checkSize; x < width; x += checkSize * 2) {
                // Skewed rects for perspective? or just flat for retro look
                graphics.fillRect(x + offset, y, checkSize, checkSize);
            }
        }

        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    private static createMountainLayer(scene: Phaser.Scene, key: string, width: number, height: number, color: number, peakVariability: number) {
        const graphics = scene.make.graphics({});
        graphics.fillStyle(color, 1);

        const resolution = 20; // Pixel steps
        const points = [];

        points.push({ x: 0, y: height }); // Bottom Left

        for (let x = 0; x <= width + resolution; x += resolution) {
            // Simple noise using sine waves
            const noise = Math.sin(x * 0.01) * peakVariability * 0.5 +
                Math.sin(x * 0.03) * peakVariability * 0.25;

            // "Pixelate" height
            const y = height - Math.abs(noise) - 50;
            const pixelY = Math.floor(y / resolution) * resolution; // Snap to grid

            points.push({ x: x, y: pixelY });
        }

        points.push({ x: width + resolution, y: height }); // Bottom Right

        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.fillPath();

        graphics.generateTexture(key, width + resolution, height);
        graphics.destroy();
    }

    private static createCloudTexture(scene: Phaser.Scene, key: string, w: number, h: number) {
        const graphics = scene.make.graphics({});
        graphics.fillStyle(0xffffff, 0.6);

        // Draw a few overlapping rectangles for pixel cloud look
        const pixelSize = 8;

        // Center block
        graphics.fillRect(pixelSize * 3, pixelSize * 2, w - pixelSize * 6, h - pixelSize * 4);
        // Top bumps
        graphics.fillRect(pixelSize * 5, pixelSize, w - pixelSize * 10, pixelSize);
        // Bottom bumps (flat)
        graphics.fillRect(pixelSize * 2, h - pixelSize * 2, w - pixelSize * 4, pixelSize);

        graphics.generateTexture(key, w, h);
        graphics.destroy();
    }
}
