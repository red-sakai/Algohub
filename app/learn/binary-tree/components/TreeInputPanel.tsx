"use client";
import { useState } from "react";

interface TreeInputPanelProps {
    value: string;
    onChange: (value: string) => void;
    onConfirm: () => void;
    error: string;
}

export default function TreeInputPanel({ value, onChange, onConfirm, error }: TreeInputPanelProps) {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Build Your Binary Tree</h3>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="px-4 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition"
                    >
                        {showHelp ? 'Hide' : 'Show'} Help
                    </button>
                </div>

                {showHelp && (
                    <div className="space-y-2 text-white/70 text-sm">
                        <p><strong>Format:</strong> Enter values separated by spaces or commas</p>
                        <p><strong>NULL nodes:</strong> Use "null" or "NULL" or leave empty (consecutive spaces/commas)</p>
                        <p><strong>Max nodes:</strong> 31 nodes (5 levels)</p>
                        <p><strong>Example:</strong> 1 2 3 null null 6 7</p>
                        <p className="text-amber-300 mt-2">
                            ⚠️ Root is index 1, children at 2i and 2i+1
                        </p>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <label className="block text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
                    Tree Values (Level-Order)
                </label>

                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter node values (e.g., 5 10 -3 6 2 null 8)..."
                    className="w-full h-32 px-4 py-3 bg-black/30 border-2 border-white/20 rounded-xl text-white text-lg font-mono placeholder:text-white/40 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/50 outline-none transition resize-none"
                />

                {/* Error Display */}
                {error && (
                    <div className="mt-3 px-4 py-2 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {/* Quick Fill Examples */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={() => onChange('5 10 -3 6 2 null 8')}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white/70 text-xs hover:bg-white/20 transition"
                    >
                        Example 1
                    </button>
                    <button
                        onClick={() => onChange('7 null 3 null null 5 null')}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white/70 text-xs hover:bg-white/20 transition"
                    >
                        Example 2
                    </button>
                    <button
                        onClick={() => onChange('')}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white/70 text-xs hover:bg-white/20 transition"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Confirm Button */}
            <div className="flex justify-center">
                <button
                    onClick={onConfirm}
                    disabled={!value.trim()}
                    className="px-12 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xl font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    ✓ Build Tree
                </button>
            </div>
        </div>
    );
}
