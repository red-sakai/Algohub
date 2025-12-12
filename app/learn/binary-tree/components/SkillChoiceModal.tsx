"use client";
import type { NodeChoice } from '../types/game';
import { getRarityColor } from '../utils/nodeGeneration';

interface SkillChoiceModalProps {
    wave: number;
    leftChoice: NodeChoice;
    rightChoice: NodeChoice;
    nextLevel: number;
    onChoose: (side: 'left' | 'right') => void;
}

export default function SkillChoiceModal({
    wave,
    leftChoice,
    rightChoice,
    nextLevel,
    onChoose,
}: SkillChoiceModalProps) {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-block px-4 py-1 bg-amber-500/20 border border-amber-500 rounded-full mb-2">
                    <span className="text-amber-300 text-sm font-semibold">⚔️ Enemy Defeated!</span>
                </div>
                <h2 className="text-4xl font-black text-white">Choose Your Skill</h2>
                <p className="text-white/60">
                    Wave {wave} Complete • Level {nextLevel}
                </p>
            </div>

            {/* Choice Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* LEFT CHOICE (Good) */}
                <button
                    onClick={() => onChoose('left')}
                    className="group relative bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-4 border-emerald-500 rounded-3xl p-8 text-left hover:scale-105 transition-transform"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-4">
                        {/* Badge */}
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                                ← LEFT
                            </span>
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border-2 ${getRarityColor(leftChoice.rarity)}`}>
                                {leftChoice.rarity}
                            </span>
                        </div>

                        {/* Value Display */}
                        <div className="text-center py-6">
                            <div className={`text-7xl font-black ${leftChoice.value > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                {leftChoice.value > 0 ? '+' : ''}{leftChoice.value}
                            </div>
                            <div className="text-white/70 text-sm mt-2">Power</div>
                        </div>

                        {/* Description */}
                        <div className="text-center">
                            <p className="text-white font-semibold">{leftChoice.description}</p>
                            <p className="text-emerald-300 text-sm mt-1">✨ Upgrade Path</p>
                        </div>

                        {/* Button */}
                        <div className="pt-2">
                            <div className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl text-center group-hover:bg-emerald-400 transition">
                                Choose Left
                            </div>
                        </div>
                    </div>
                </button>

                {/* RIGHT CHOICE (Bad) */}
                <button
                    onClick={() => onChoose('right')}
                    className="group relative bg-gradient-to-br from-rose-500/20 to-red-500/20 border-4 border-rose-500 rounded-3xl p-8 text-left hover:scale-105 transition-transform"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-rose-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-4">
                        {/* Badge */}
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                                RIGHT →
                            </span>
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border-2 ${getRarityColor(rightChoice.rarity)}`}>
                                {rightChoice.rarity}
                            </span>
                        </div>

                        {/* Value Display */}
                        <div className="text-center py-6">
                            <div className={`text-7xl font-black ${rightChoice.value > 0 ? 'text-green-400' :
                                    rightChoice.value < 0 ? 'text-red-400' :
                                        'text-gray-400'
                                }`}>
                                {rightChoice.value > 0 ? '+' : ''}{rightChoice.value}
                            </div>
                            <div className="text-white/70 text-sm mt-2">Power</div>
                        </div>

                        {/* Description */}
                        <div className="text-center">
                            <p className="text-white font-semibold">{rightChoice.description}</p>
                            <p className="text-rose-300 text-sm mt-1">
                                {rightChoice.value >= 0 ? '⚠️ Risk Path' : '💀 Downgrade Path'}
                            </p>
                        </div>

                        {/* Button */}
                        <div className="pt-2">
                            <div className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl text-center group-hover:bg-rose-400 transition">
                                Choose Right
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            {/* Hint */}
            <div className="text-center">
                <p className="text-white/50 text-sm">
                    💡 Left choices are usually better, but right might surprise you!
                </p>
            </div>
        </div>
    );
}
