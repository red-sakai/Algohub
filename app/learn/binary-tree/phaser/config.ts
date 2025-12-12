/**
 * Phaser Game Configuration
 */
import * as Phaser from 'phaser';
import CombatScene from './scenes/CombatScene';
import SkillChoiceScene from './scenes/SkillChoiceScene';
import ResultsScene from './scenes/ResultsScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-game',
    backgroundColor: '#1e293b',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: [CombatScene, SkillChoiceScene, ResultsScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};
