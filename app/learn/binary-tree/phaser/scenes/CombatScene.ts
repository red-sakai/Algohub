/**
 * Combat Scene - Main gameplay with sprite combat
 * Uses simple colored shapes as placeholder graphics
 */
import * as Phaser from 'phaser';
import type { Character } from '../../types/character';
import { CHARACTER_COLORS } from '../../types/character';
import { TreeVisualizer } from '../TreeVisualizer';
import { PixelSpriteFactory, HERO_GRID, SLIME_GRID, GOBLIN_GRID, ORC_GRID, BOSS_GRID } from '../utils/PixelSpriteFactory';
import { BackgroundGenerator } from '../utils/BackgroundGenerator';

export default class CombatScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Sprite;
    private enemy!: Phaser.GameObjects.Sprite;
    private playerShadow!: Phaser.GameObjects.Ellipse;
    private enemyShadow!: Phaser.GameObjects.Ellipse;
    private playerHP!: number;
    private enemyHP!: number;
    private enemyMaxHP!: number;
    private wave!: number;
    private basePower!: number;

    private playerHPBar!: Phaser.GameObjects.Graphics;
    private enemyHPBar!: Phaser.GameObjects.Graphics;
    private waveText!: Phaser.GameObjects.Text;
    private attackButton!: Phaser.GameObjects.Rectangle;
    private attackButtonText!: Phaser.GameObjects.Text;

    private character!: Character;
    private treeValues!: (number | null)[];
    private nodeCount!: number;

    private treeVisualizer!: TreeVisualizer;

    constructor() {
        super({ key: 'CombatScene' });
    }

    init(data: any) {
        // Receive data from previous scene or initial load
        this.character = data.character || {
            name: 'Hero',
            color: 'blue',
            style: 'warrior',
            emoji: '⚔️'
        };
        this.treeValues = data.treeValues || Array(32).fill(null);
        this.treeValues[1] = 5; // Root
        this.wave = data.wave || 1;
        this.nodeCount = data.nodeCount || 1;

        this.basePower = 10;
        this.playerHP = 100;
        this.enemyMaxHP = 20 + (this.wave * 2);
        this.enemyHP = this.enemyMaxHP;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Generate Amazing Background
        BackgroundGenerator.createBackground(this);

        // Add background layers
        this.add.image(width / 2, height / 2, 'sky-bg').setDepth(-10);
        this.add.image(width / 2, height / 2, 'bg-sun').setPosition(width * 0.7, height * 0.2).setDepth(-9);
        this.add.image(width / 2, height, 'mountains-back').setOrigin(0.5, 1).setDepth(-8);
        this.add.image(width / 2, height, 'mountains-front').setOrigin(0.5, 1).setDepth(-7);

        // Clouds
        this.add.image(width * 0.2, height * 0.15, 'cloud-1').setDepth(-6).setAlpha(0.8);
        this.add.image(width * 0.8, height * 0.25, 'cloud-1').setDepth(-6).setAlpha(0.8);

        // Ground/Platform
        const groundY = height - 100; // Characters stand here
        const ground = this.add.rectangle(width / 2, height, width, 200, 0x1a1a1a); // Dark ground
        ground.setOrigin(0.5, 1).setDepth(-5);

        // Grass strip
        const grass = this.add.rectangle(width / 2, height - 200, width, 20, 0x4ade80);
        grass.setOrigin(0.5, 1).setDepth(-5);

        // ===== TOP LEFT - PLAYER INFO PANEL =====
        const playerColor = CHARACTER_COLORS[this.character.color];
        const playerColorHex = this.getColorHex(this.character.color);

        // Responsive positioning
        const leftPanelX = width * 0.05;
        const leftPanelY = 40;

        // Player panel background
        const playerPanelBg = this.add.rectangle(leftPanelX, leftPanelY, 300, 100, 0x1e293b, 0.9).setOrigin(0, 0);
        playerPanelBg.setStrokeStyle(4, playerColorHex, 1);

        // Skew effect for fighting game look
        // (Phaser Graphics unfortunately doesn't support skew, keeping rect for now)

        // Player portrait/avatar
        const playerAvatar = this.add.rectangle(leftPanelX + 15, leftPanelY + 15, 70, 70, playerColorHex, 1).setOrigin(0, 0);
        playerAvatar.setStrokeStyle(2, 0xffffff, 0.9);

        // Player emoji/icon
        this.add.text(leftPanelX + 50, leftPanelY + 50, this.character.emoji, {
            fontSize: '40px',
        }).setOrigin(0.5);

        // Player name
        this.add.text(leftPanelX + 100, leftPanelY + 20, this.character.name, {
            fontSize: '24px',
            color: '#fff',
            fontStyle: 'bold',
            fontFamily: 'Verdana' // Or pixel font if loaded
        }).setOrigin(0, 0);

        // Player HP Bar Container
        this.playerHPBar = this.add.graphics();
        this.updatePlayerHP(); // We'll need to update this function to use dynamic position

        // ===== TOP CENTER - WAVE/LEVEL =====
        this.add.text(width / 2, 50, `WAVE ${this.wave}`, {
            fontSize: '32px',
            color: '#fbbf24',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // ===== TOP RIGHT - ENEMY INFO PANEL =====
        const enemyNames = ['Slime', 'Goblin', 'Orc', 'Dragon', 'Demon Lord'];
        const enemyName = enemyNames[Math.min(Math.floor((this.wave - 1) / 2), enemyNames.length - 1)];
        const rightPanelX = width * 0.65; // Start 65% across
        // panelWidth is already defined if needed, or just use literal/constant
        const enemyPanelWidth = 300;

        // Enemy panel background
        const enemyPanelBg = this.add.rectangle(width - leftPanelX - enemyPanelWidth, leftPanelY, enemyPanelWidth, 100, 0x1e293b, 0.9).setOrigin(0, 0);
        enemyPanelBg.setStrokeStyle(4, 0xef4444, 1);

        // Enemy portrait
        const enemyAvatar = this.add.rectangle(width - leftPanelX - 85, leftPanelY + 15, 70, 70, 0xef4444, 1).setOrigin(0, 0);
        enemyAvatar.setStrokeStyle(2, 0xffffff, 0.9);

        let enemyEmoji = '👾';
        if (enemyName.includes('Slime')) enemyEmoji = '💧';
        if (enemyName.includes('Goblin')) enemyEmoji = '👺';
        if (enemyName.includes('Orc')) enemyEmoji = '👹';
        if (enemyName.includes('Dragon')) enemyEmoji = '🐲';

        this.add.text(width - leftPanelX - 50, leftPanelY + 50, enemyEmoji, {
            fontSize: '40px',
        }).setOrigin(0.5);

        // Enemy name
        this.add.text(width - leftPanelX - 100, leftPanelY + 20, enemyName, {
            fontSize: '24px',
            color: '#fff',
            fontStyle: 'bold',
            align: 'right'
        }).setOrigin(1, 0);

        this.enemyHPBar = this.add.graphics();
        this.updateEnemyHP();

        // ===== CENTER - COMBAT ARENA =====
        const charY = height - 120; // Standing on the ground

        // Player Position (Left Side)
        const playerX = width * 0.25;

        // Shadow
        this.playerShadow = this.add.ellipse(playerX, charY + 10, 100, 30, 0x000000, 0.4);

        // Sprite - Scale 4x for 32px -> 128px height (Nice size for full screen)
        this.player = this.add.sprite(playerX, charY, 'hero');
        this.player.setScale(4);
        this.player.setOrigin(0.5, 1); // Anchor at feet

        // Enemy Position (Right Side)
        const enemyX = width * 0.75;

        let enemyKey = 'slime';
        if (enemyName.includes('Goblin')) enemyKey = 'goblin';
        if (enemyName.includes('Orc')) enemyKey = 'orc';
        if (enemyName.includes('Demon') || enemyName.includes('Dragon')) enemyKey = 'boss';

        // Shadow
        this.enemyShadow = this.add.ellipse(enemyX, charY + 10, 100, 30, 0x000000, 0.4);

        this.enemy = this.add.sprite(enemyX, charY, enemyKey);
        this.enemy.setScale(4);
        this.enemy.setOrigin(0.5, 1); // Anchor at feet

        // Flip enemy to face player
        this.enemy.setFlipX(true);

        // Character idle animations - breathe/bounce
        this.tweens.add({
            targets: this.player,
            scaleY: 4.8, // Slight squash from 5
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.enemy,
            scaleY: 4.8, // Slight squash from 5
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Shadow breathing
        this.tweens.add({
            targets: [this.playerShadow, this.enemyShadow],
            scaleX: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ===== BOTTOM CENTER - ATTACK BUTTON =====
        const buttonY = height - 40;

        // Button glow/background
        const buttonGlow = this.add.rectangle(width / 2, buttonY, 240, 70, playerColorHex, 0.3);
        buttonGlow.setStrokeStyle(0, 0x000000, 0);

        // Pulsing glow animation
        this.tweens.add({
            targets: buttonGlow,
            alpha: 0.5,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Main attack button
        this.attackButton = this.add.rectangle(width / 2, buttonY, 220, 60, playerColorHex)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleAttack())
            .on('pointerover', () => {
                this.attackButton.setScale(1.08);
                this.attackButton.setStrokeStyle(3, 0xffffff, 1);
            })
            .on('pointerout', () => {
                this.attackButton.setScale(1);
                this.attackButton.setStrokeStyle(3, 0xffffff, 0.7);
            });

        this.attackButton.setStrokeStyle(3, 0xffffff, 0.7);

        // Attack button text
        this.attackButtonText = this.add.text(width / 2, buttonY, '⚔️ ATTACK', {
            fontSize: '28px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Damage info text
        this.add.text(width / 2, buttonY + 35, `Deal ${this.basePower} damage`, {
            fontSize: '12px',
            color: '#94a3b8',
        }).setOrigin(0.5);

        // ===== BOTTOM RIGHT - TREE VISUALIZER =====
        const treePanelX = width - 5;
        const treePanelY = height - 75;
        const panelWidth = 100;
        const panelHeight = 140;

        const treePanel = this.add.rectangle(treePanelX, treePanelY, panelWidth, panelHeight, 0x1e293b, 0.9);
        treePanel.setStrokeStyle(2, 0x0ea5e9, 0.8);

        this.add.text(treePanelX, treePanelY - 70, 'Your Tree', {
            fontSize: '11px',
            color: '#0ea5e9',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Initialize and draw tree
        this.treeVisualizer = new TreeVisualizer(this);
        this.treeVisualizer.drawTree(treePanelX, treePanelY - 50, this.treeValues, 90, 120);
    }

    private getColorHex(color: string): number {
        const colorMap: Record<string, number> = {
            red: 0xef4444,
            blue: 0x3b82f6,
            green: 0x22c55e,
            purple: 0xa855f7,
            orange: 0xf97316,
            pink: 0xec4899,
        };
        return colorMap[color] || 0x3b82f6;
    }

    private updatePlayerHP() {
        this.playerHPBar.clear();
        // HP bar in top-left panel
        const barX = 120;
        const barY = 65;
        const barWidth = 130;
        const barHeight = 12;

        // Background
        this.playerHPBar.fillStyle(0x000000, 0.4);
        this.playerHPBar.fillRect(barX, barY, barWidth, barHeight);

        // HP fill
        this.playerHPBar.fillStyle(0x22c55e);
        this.playerHPBar.fillRect(barX, barY, (this.playerHP / 100) * barWidth, barHeight);

        // Border
        this.playerHPBar.lineStyle(2, 0xffffff, 0.3);
        this.playerHPBar.strokeRect(barX, barY, barWidth, barHeight);
    }

    private updateEnemyHP() {
        this.enemyHPBar.clear();
        // HP bar in top-right panel
        const width = this.cameras.main.width;
        const barX = width - 200;
        const barY = 65;
        const barWidth = 130;
        const barHeight = 12;

        // Background
        this.enemyHPBar.fillStyle(0x000000, 0.4);
        this.enemyHPBar.fillRect(barX, barY, barWidth, barHeight);

        // HP fill
        this.enemyHPBar.fillStyle(0xef4444);
        this.enemyHPBar.fillRect(barX, barY, (this.enemyHP / this.enemyMaxHP) * barWidth, barHeight);

        // Border
        this.enemyHPBar.lineStyle(2, 0xffffff, 0.3);
        this.enemyHPBar.strokeRect(barX, barY, barWidth, barHeight);
    }

    private handleAttack() {
        // Disable button during attack
        this.attackButton.disableInteractive();

        const startScaleX = 5; // Current scale
        const startX = this.player.x;

        // 1. Wind up (move back slightly)
        this.tweens.add({
            targets: this.player,
            x: startX - 30,
            scaleX: startScaleX * 0.9, // Slight squash
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                // 2. Dash Attack (Lunge forward)
                this.tweens.add({
                    targets: this.player,
                    x: this.enemy.x - 100, // Stop just in front of enemy
                    scaleX: startScaleX * 1.2, // Stretch forward
                    duration: 100,
                    ease: 'Expo.easeIn',
                    onComplete: () => {
                        // 3. Impact!
                        const impactY = this.enemy.y - 60; // Center of mass (approx half height)

                        // Screen shake
                        this.cameras.main.shake(150, 0.02);

                        // Flash effect
                        this.cameras.main.flash(50, 255, 255, 255);

                        // Hit visual (Slash effect)
                        const slash = this.add.rectangle(this.enemy.x, impactY, 10, 150, 0xffffff);
                        slash.rotation = Math.PI / 4;
                        this.tweens.add({
                            targets: slash,
                            scaleX: 15,
                            alpha: 0,
                            duration: 150,
                            onComplete: () => slash.destroy()
                        });

                        // Hit particles
                        const particles = this.add.particles(this.enemy.x, impactY, 'particle', {
                            speed: { min: 100, max: 300 },
                            angle: { min: 0, max: 360 },
                            scale: { start: 1.5, end: 0 },
                            lifespan: 400,
                            quantity: 30,
                            tint: 0xffcc00 // Gold sparks
                        });
                        particles.explode();

                        // Enemy hurt animation (Flash red and shake)
                        this.tweens.add({
                            targets: this.enemy,
                            tint: 0xff0000,
                            x: this.enemy.x + 20, // Knapp back
                            duration: 50,
                            yoyo: true,
                            repeat: 3,
                            onComplete: () => {
                                this.enemy.clearTint();
                                // Reset enemy pos
                                this.tweens.add({
                                    targets: this.enemy,
                                    x: 600, // Original pos or use variable if dynamic
                                    duration: 200
                                });
                            }
                        });

                        // Damage enemy
                        this.enemyHP -= this.basePower;
                        this.updateEnemyHP();

                        // POPPING Damage Number
                        const damageText = this.add.text(this.enemy.x, impactY - 80, `${this.basePower}`, {
                            fontSize: '48px',
                            color: '#fbbf24', // Amber/Gold
                            fontStyle: 'bold',
                            stroke: '#000000',
                            strokeThickness: 4
                        }).setOrigin(0.5);

                        // Damage text animation (Pop up and fall)
                        this.tweens.add({
                            targets: damageText,
                            y: damageText.y - 60,
                            scale: 1.5,
                            duration: 200,
                            ease: 'Back.out',
                            onComplete: () => {
                                this.tweens.add({
                                    targets: damageText,
                                    y: damageText.y + 30,
                                    alpha: 0,
                                    duration: 500,
                                    delay: 200,
                                    onComplete: () => damageText.destroy()
                                });
                            }
                        });

                        // 4. Return to idle
                        this.tweens.add({
                            targets: this.player,
                            x: startX, // Original pos based on variable
                            scaleX: startScaleX,
                            duration: 300,
                            ease: 'Power2',
                            delay: 100,
                            onComplete: () => {
                                // Check if enemy defeated
                                if (this.enemyHP <= 0) {
                                    this.enemyDefeated();
                                } else {
                                    this.attackButton.setInteractive();
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    private enemyDefeated() {
        // Victory animation
        this.tweens.add({
            targets: this.enemy,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 500,
            onComplete: () => {
                // Wave 5 boss defeated - go straight to results!
                if (this.wave === 5) {
                    this.scene.start('ResultsScene', {
                        character: this.character,
                        treeValues: this.treeValues,
                        wave: this.wave,
                        nodeCount: this.nodeCount
                    });
                } else {
                    // Normal enemy - go to skill choice
                    this.scene.start('SkillChoiceScene', {
                        character: this.character,
                        treeValues: this.treeValues,
                        wave: this.wave,
                        nodeCount: this.nodeCount
                    });
                }
            }
        });
    }

    // Create simple particle texture
    preload() {
        // Create a simple circle texture for particles
        const graphics = this.make.graphics({});
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);
        graphics.destroy();

        // Generate Pixel Art Textures
        // Use character color for Hero palette if we want dynamic colors, 
        // but for now let's stick to the default palette or update it.
        // We'll use the default factory palette but maybe tint the sprite if needed.

        PixelSpriteFactory.createTexture(this, 'hero', HERO_GRID);
        PixelSpriteFactory.createTexture(this, 'slime', SLIME_GRID);
        PixelSpriteFactory.createTexture(this, 'goblin', GOBLIN_GRID);
        PixelSpriteFactory.createTexture(this, 'orc', ORC_GRID);
        PixelSpriteFactory.createTexture(this, 'boss', BOSS_GRID);
    }
}
