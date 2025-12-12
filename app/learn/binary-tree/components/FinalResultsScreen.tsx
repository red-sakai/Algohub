"use client";
import { useState, useEffect } from "react";
import type { TraversalType, RunStats } from '../types/game';

interface FinalResultsScreenProps {
    basePower: number;
    traversalType: TraversalType;
    traversalValues: number[];
    finalPower: number;
    stats: RunStats;
    onPlayAgain: () => void;
    onBackToMenu: () => void;
}

export default function FinalResultsScreen({
    basePower,
    traversalType,
    traversalValues,
    finalPower,
    stats,
    onPlayAgain,
    onBackToMenu,
}: FinalResultsScreenProps) {
    const [animationStep, setAnimationStep] = useState(0);
    const [currentSum, setCurrentSum] = useState(0);

    // Animate the sum calculation
    useEffect(() => {
        if (animationStep < traversalValues.length) {
            const timer = setTimeout(() => {
                setCurrentSum(prev => prev + traversalValues[animationStep]);
                setAnimationStep(prev => prev + 1);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [animationStep, traversalValues]);

    const isAnimationComplete = animationStep >= traversalValues.length;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-block px-6 py-2 bg-amber-500/20 border-2 border-amber-500 rounded-full">
                    <span className="text-amber-300 text-lg font-bold">🏆 RUN COMPLETE!</span>
                </div>
                <h2 className="text-5xl font-black text-white">Final Power Calculation</h2>
            </div>

            {/* Traversal Info */}
            <div className="text-center">
                <p className="text-white/60 mb-2">Traversal Method:</p>
                <div className="inline-block px-6 py-3 bg-sky-500/20 border-2 border-sky-500 rounded-xl">
                    <span className="text-sky-300 text-2xl font-bold uppercase">{traversalType}</span>
                </div>
            </div>

            {/* Animated Calculation */}
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/10 space-y-6">
                {/* Formula Display */}
                <div className="text-center space-y-4">
                    <div className="text-white/60 text-sm uppercase tracking-wider">
                        Calculation
                    </div>

                    {/* Base Power */}
                    <div className="text-white text-2xl">
                        Base Power: <span className="font-bold text-sky-400">{basePower}</span>
                    </div>

                    {/* Values Animation */}
                    <div className="flex flex-wrap justify-center gap-2 min-h-[60px]">
                        {traversalValues.map((val, idx) => (
                            <div
                                key={idx}
                                className={`px-4 py-2 rounded-lg font-mono text-xl font-bold transition-all duration-300 ${idx < animationStep
                                        ? val > 0
                                            ? 'bg-green-500/30 text-green-300 border-2 border-green-500'
                                            : val < 0
                                                ? 'bg-red-500/30 text-red-300 border-2 border-red-500'
                                                : 'bg-gray-500/30 text-gray-300 border-2 border-gray-500'
                                        : 'bg-white/10 text-white/30 border-2 border-white/20'
                                    } ${idx === animationStep - 1 ? 'scale-110 ring-4 ring-white/50' : ''
                                    }`}
                            >
                                {val > 0 ? '+' : ''}{val}
                            </div>
                        ))}
                    </div>

                    {/* Running Sum */}
                    <div className="text-white text-3xl">
                        Current Sum: <span className="font-bold text-purple-400">{currentSum}</span>
                    </div>

                    {/* Final Power (shown after animation) */}
                    {isAnimationComplete && (
                        <div className="animate-in fade-in zoom-in duration-500 pt-6">
                            <div className="inline-block px-12 py-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl shadow-2xl">
                                <div className="text-white/80 text-sm uppercase tracking-wider mb-2">
                                    Final Power
                                </div>
                                <div className="text-white text-7xl font-black">
                                    {finalPower}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Panel (shown after animation) */}
            {isAnimationComplete && (
                <div className="animate-in fade-in slide-in-from-bottom duration-500 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Waves</div>
                        <div className="text-white text-3xl font-bold">{stats.wavesDefeated}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Nodes</div>
                        <div className="text-white text-3xl font-bold">{stats.nodesEarned}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Left Picks</div>
                        <div className="text-green-400 text-3xl font-bold">{stats.leftChoices}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Right Picks</div>
                        <div className="text-red-400 text-3xl font-bold">{stats.rightChoices}</div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {isAnimationComplete && (
                <div className="flex flex-wrap gap-4 justify-center animate-in fade-in slide-in-from-bottom duration-500 delay-300">
                    <button
                        onClick={onPlayAgain}
                        className="px-10 py-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-lg font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
                    >
                        🔄 Play Again
                    </button>
                    <button
                        onClick={onBackToMenu}
                        className="px-10 py-4 bg-white/10 border-2 border-white/20 text-white text-lg font-bold rounded-xl hover:bg-white/20 transition"
                    >
                        ← Back to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
