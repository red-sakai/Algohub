'use client';

/**
 * Game Controls Component
 * Handles traversal selection, launch mechanism, and playback controls
 */

import { GamePhase, TraversalType, PinballState } from '@/types/pinball';

interface Props {
  phase: GamePhase;
  onStartTraversal: (type: TraversalType) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onNewTree: () => void;
  selectedTraversal: TraversalType;
  pinballState: PinballState | null;
  onLaunchStart?: (startY?: number) => void;
  onLaunchEnd?: () => void;
}

export default function GameControls({
  phase,
  onStartTraversal,
  onPause,
  onResume,
  onReset,
  onNewTree,
  selectedTraversal,
  pinballState,
  onLaunchStart,
  onLaunchEnd
}: Props) {
  return (
    <div className="select-none bg-gradient-to-br from-slate-900/98 via-purple-950/95 to-slate-900/98 backdrop-blur-lg p-6 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.4)] border-4 border-purple-500/60 max-w-md relative overflow-hidden">
      {/* Neon glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 opacity-20 blur-xl pointer-events-none" />
      
      {/* Traversal Selection */}
      {phase === 'select' && (
        <div className="space-y-3 relative z-10">
          <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 font-black text-xl mb-4 tracking-wide uppercase text-center drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
            🎮 Select Algorithm
          </h3>
          
          <button
            onClick={() => onStartTraversal('preorder')}
            className="w-full px-5 py-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white rounded-xl font-black hover:from-red-500 hover:via-red-400 hover:to-red-500 transition-all shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:shadow-[0_0_35px_rgba(239,68,68,0.9)] border-2 border-red-400/50 hover:border-red-300 flex items-center justify-between group hover:scale-105 active:scale-95"
          >
            <span className="text-lg drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]">PREORDER (Root → L → R)</span>
            <span className="text-sm opacity-80 group-hover:opacity-100 animate-pulse">▶ CASCADE</span>
          </button>

          <button
            onClick={() => onStartTraversal('inorder')}
            className="w-full px-5 py-4 bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white rounded-xl font-black hover:from-green-500 hover:via-green-400 hover:to-green-500 transition-all shadow-[0_0_25px_rgba(34,197,94,0.6)] hover:shadow-[0_0_35px_rgba(34,197,94,0.9)] border-2 border-green-400/50 hover:border-green-300 flex items-center justify-between group hover:scale-105 active:scale-95"
          >
            <span className="text-lg drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]">INORDER (L → Root → R)</span>
            <span className="text-sm opacity-80 group-hover:opacity-100 animate-pulse">▶ ZIGZAG</span>
          </button>

          <button
            onClick={() => onStartTraversal('postorder')}
            className="w-full px-5 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white rounded-xl font-black hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 transition-all shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:shadow-[0_0_35px_rgba(59,130,246,0.9)] border-2 border-blue-400/50 hover:border-blue-300 flex items-center justify-between group hover:scale-105 active:scale-95"
          >
            <span className="text-lg drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]">POSTORDER (L → R → Root)</span>
            <span className="text-sm opacity-80 group-hover:opacity-100 animate-pulse">▶ CLIMB</span>
          </button>

          <button
            onClick={onNewTree}
            className="w-full px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 transition-all mt-4 text-sm font-bold border-2 border-slate-500/50 hover:border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.4)] hover:scale-105 active:scale-95"
          >
            🌳 NEW TREE
          </button>
        </div>
      )}

      {/* Launch Controls - DRAG PLUNGER */}
      {phase === 'ready' && pinballState && !pinballState.isLaunched && (
        <div className="space-y-3 relative z-10">
          <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 font-black text-2xl mb-3 text-center animate-pulse drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">🎯 READY TO LAUNCH!</h3>
          
          <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 p-5 rounded-xl border-4 border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-cyan-500/20 pointer-events-none" />
            <div className="text-white font-black mb-3 flex items-center gap-3 relative z-10">
              <span className="text-3xl animate-pulse">🎮</span>
              <span className="text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">DRAG THE PLUNGER!</span>
            </div>
            <p className="text-cyan-200 text-base mb-4 font-semibold relative z-10 drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]">
              Click and drag the plunger DOWN in the 3D view, then release to launch!
            </p>
            <p className="text-yellow-300 text-sm font-black animate-pulse relative z-10 drop-shadow-[0_0_6px_rgba(253,224,71,0.8)]">
              👉 PLUNGER is on the RIGHT SIDE of the table
            </p>
            
            {pinballState.launcherCharge > 0 && (
              <div className="mt-4 relative z-10">
                <div className="text-xs text-yellow-300 font-bold mb-1 uppercase tracking-wider">Power: {Math.floor(pinballState.launcherCharge * 100)}%</div>
                <div className="h-4 bg-slate-900/80 rounded-full overflow-hidden border-2 border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 transition-all shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                    style={{ width: `${pinballState.launcherCharge * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-center relative z-10">
            <span className="text-purple-300 font-semibold">Selected:</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-black text-base drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]">{selectedTraversal.toUpperCase()}</span>
          </div>

          <button
            onClick={onNewTree}
            className="w-full px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 transition-all text-sm font-bold border-2 border-slate-500/50 hover:border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.4)] hover:scale-105 active:scale-95"
          >
            🔄 CHANGE ALGORITHM
          </button>
        </div>
      )}

      {/* After Launch - Show Playback Controls */}
      {phase === 'ready' && pinballState && pinballState.isLaunched && (
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-black text-xl drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
              {selectedTraversal.charAt(0).toUpperCase() + selectedTraversal.slice(1).toUpperCase()}
            </h3>
            <div className="px-4 py-2 rounded-full text-sm font-black bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.7)] border-2 border-cyan-300/50 animate-pulse">
              🚀 IN FLIGHT
            </div>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      {(phase === 'traversing' || phase === 'paused') && (
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-black text-xl drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
              {selectedTraversal.charAt(0).toUpperCase() + selectedTraversal.slice(1).toUpperCase()}
            </h3>
            <div className={`px-4 py-2 rounded-full text-sm font-black border-2 ${
              phase === 'traversing' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] border-green-300/50' 
                : 'bg-gradient-to-r from-yellow-600 to-orange-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.7)] border-yellow-300/50'
            }`}>
              {phase === 'traversing' ? '▶ PLAYING' : '⏸ PAUSED'}
            </div>
          </div>

          <div className="flex gap-3">
            {phase === 'traversing' ? (
              <button
                onClick={onPause}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-yellow-600 via-yellow-500 to-orange-600 text-white rounded-xl font-black hover:from-yellow-500 hover:via-yellow-400 hover:to-orange-500 transition-all shadow-[0_0_20px_rgba(234,179,8,0.6)] hover:shadow-[0_0_30px_rgba(234,179,8,0.9)] border-2 border-yellow-400/50 hover:scale-105 active:scale-95"
              >
                ⏸ PAUSE
              </button>
            ) : (
              <button
                onClick={onResume}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white rounded-xl font-black hover:from-green-500 hover:via-green-400 hover:to-emerald-500 transition-all shadow-[0_0_20px_rgba(34,197,94,0.6)] hover:shadow-[0_0_30px_rgba(34,197,94,0.9)] border-2 border-green-400/50 hover:scale-105 active:scale-95"
              >
                ▶ RESUME
              </button>
            )}

            <button
              onClick={onReset}
              className="px-5 py-3 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 transition-all font-black border-2 border-slate-500/50 hover:border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.4)] hover:scale-105 active:scale-95"
            >
              🔄 RESET
            </button>
          </div>

          <button
            onClick={onReset}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-black hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all shadow-[0_0_30px_rgba(139,92,246,0.7)] hover:shadow-[0_0_40px_rgba(139,92,246,1)] border-2 border-purple-400/50 hover:border-purple-300 text-lg hover:scale-105 active:scale-95"
          >
            🎯 LAUNCH AGAIN
          </button>

          <button
            onClick={onNewTree}
            className="w-full px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 transition-all font-bold border-2 border-slate-500/50 hover:border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.4)] hover:scale-105 active:scale-95"
          >
            🔄 CHANGE ALGORITHM / NEW TREE
          </button>
        </div>
      )}

      {/* Complete State */}
      {phase === 'complete' && (
        <div className="space-y-4 relative z-10">
          <div className="text-center mb-6 relative">
            <div className="text-6xl mb-3 animate-bounce">🎉</div>
            <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-green-400 to-cyan-400 font-black text-2xl drop-shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse uppercase">
              TRAVERSAL COMPLETE!
            </h3>
            <p className="text-cyan-200 text-base mt-3 font-bold drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]">
              {selectedTraversal.charAt(0).toUpperCase() + selectedTraversal.slice(1).toUpperCase()} finished successfully! 🏆
            </p>
          </div>

          <button
            onClick={onReset}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 via-cyan-600 to-blue-600 text-white rounded-xl font-black hover:from-green-500 hover:via-cyan-500 hover:to-blue-500 transition-all shadow-[0_0_35px_rgba(34,197,94,0.8)] hover:shadow-[0_0_45px_rgba(34,197,94,1)] border-2 border-cyan-400/50 hover:border-cyan-300 text-lg hover:scale-105 active:scale-95"
          >
            🎮 TRY ANOTHER TRAVERSAL
          </button>

          <button
            onClick={onNewTree}
            className="w-full px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 transition-all font-bold border-2 border-slate-500/50 hover:border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.4)] hover:scale-105 active:scale-95"
          >
            🌳 NEW TREE
          </button>
        </div>
      )}
    </div>
  );
}
