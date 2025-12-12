/**
 * Character types and customization options
 */

export interface Character {
    name: string;
    color: CharacterColor;
    style: CharacterStyle;
    emoji: string;
}

export type CharacterColor = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';
export type CharacterStyle = 'warrior' | 'mage' | 'rogue' | 'knight' | 'archer';

export const CHARACTER_COLORS: Record<CharacterColor, { primary: string; secondary: string; name: string }> = {
    red: { primary: 'from-red-500 to-rose-600', secondary: 'bg-red-500', name: 'Crimson' },
    blue: { primary: 'from-blue-500 to-cyan-600', secondary: 'bg-blue-500', name: 'Azure' },
    green: { primary: 'from-green-500 to-emerald-600', secondary: 'bg-green-500', name: 'Verdant' },
    purple: { primary: 'from-purple-500 to-violet-600', secondary: 'bg-purple-500', name: 'Amethyst' },
    orange: { primary: 'from-orange-500 to-amber-600', secondary: 'bg-orange-500', name: 'Ember' },
    pink: { primary: 'from-pink-500 to-fuchsia-600', secondary: 'bg-pink-500', name: 'Rose' },
};

export const CHARACTER_STYLES: Record<CharacterStyle, { emoji: string; name: string }> = {
    warrior: { emoji: '⚔️', name: 'Warrior' },
    mage: { emoji: '🔮', name: 'Mage' },
    rogue: { emoji: '🗡️', name: 'Rogue' },
    knight: { emoji: '🛡️', name: 'Knight' },
    archer: { emoji: '🏹', name: 'Archer' },
};
