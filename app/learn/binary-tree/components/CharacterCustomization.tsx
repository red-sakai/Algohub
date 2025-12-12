"use client";
import { useState } from "react";
import type { Character, CharacterColor, CharacterStyle } from "../types/character";
import { CHARACTER_COLORS, CHARACTER_STYLES } from "../types/character";

interface CharacterCustomizationProps {
    onComplete: (character: Character) => void;
}

export default function CharacterCustomization({ onComplete }: CharacterCustomizationProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState<CharacterColor>("blue");
    const [style, setStyle] = useState<CharacterStyle>("warrior");

    const handleStart = () => {
        if (!name.trim()) {
            alert("Please enter a character name!");
            return;
        }

        onComplete({
            name: name.trim(),
            color,
            style,
            emoji: CHARACTER_STYLES[style].emoji,
        });
    };

    const selectedColorInfo = CHARACTER_COLORS[color];
    const selectedStyleInfo = CHARACTER_STYLES[style];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-5xl font-black text-white">Create Your Hero</h2>
                <p className="text-white/70 text-lg">
                    Customize your character before entering the dungeon
                </p>
            </div>

            {/* Preview */}
            <div className="flex justify-center">
                <div className={`relative w-64 h-64 rounded-3xl bg-gradient-to-br ${selectedColorInfo.primary} border-4 border-white/30 shadow-2xl flex items-center justify-center`}>
                    <div className="text-9xl">{selectedStyleInfo.emoji}</div>
                    {name && (
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <div className="inline-block px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border-2 border-white/30">
                                <span className="text-white font-bold text-lg">{name}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Name Input */}
            <div className="space-y-3">
                <label className="block text-white/80 text-sm font-semibold uppercase tracking-wider">
                    Character Name
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your hero's name..."
                    maxLength={20}
                    className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white text-xl font-semibold placeholder:text-white/40 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/50 outline-none transition"
                />
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
                <label className="block text-white/80 text-sm font-semibold uppercase tracking-wider">
                    Color Theme
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {(Object.keys(CHARACTER_COLORS) as CharacterColor[]).map((colorKey) => {
                        const colorInfo = CHARACTER_COLORS[colorKey];
                        const isSelected = color === colorKey;

                        return (
                            <button
                                key={colorKey}
                                onClick={() => setColor(colorKey)}
                                className={`group relative p-4 rounded-xl border-4 transition-all ${isSelected
                                        ? 'border-white scale-105 shadow-lg'
                                        : 'border-white/20 hover:border-white/40 hover:scale-105'
                                    }`}
                            >
                                <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${colorInfo.primary}`} />
                                <div className="mt-2 text-center">
                                    <p className="text-white text-xs font-semibold">{colorInfo.name}</p>
                                </div>
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        ✓
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Style Selection */}
            <div className="space-y-3">
                <label className="block text-white/80 text-sm font-semibold uppercase tracking-wider">
                    Class
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(Object.keys(CHARACTER_STYLES) as CharacterStyle[]).map((styleKey) => {
                        const styleInfo = CHARACTER_STYLES[styleKey];
                        const isSelected = style === styleKey;

                        return (
                            <button
                                key={styleKey}
                                onClick={() => setStyle(styleKey)}
                                className={`group relative p-6 rounded-xl border-4 transition-all ${isSelected
                                        ? 'border-white bg-white/10 scale-105 shadow-lg'
                                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 hover:scale-105'
                                    }`}
                            >
                                <div className="text-5xl mb-2">{styleInfo.emoji}</div>
                                <p className="text-white text-sm font-semibold">{styleInfo.name}</p>
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        ✓
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Start Button */}
            <div className="text-center pt-4">
                <button
                    onClick={handleStart}
                    className="px-12 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-2xl font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                    ⚔️ Begin Adventure
                </button>
            </div>
        </div>
    );
}
