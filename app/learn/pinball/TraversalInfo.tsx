'use client';

/**
 * Traversal Information Display
 * Shows current progress and traversal order
 */

import { TraversalResult, TraversalStep } from '@/types/pinball';

interface Props {
  traversal: TraversalResult;
  currentStep: TraversalStep | null;
  visitedSteps: TraversalStep[];
}

export default function TraversalInfo({ traversal, currentStep, visitedSteps }: Props) {
  return (
    <div className="bg-gradient-to-br from-slate-900/98 via-purple-950/95 to-slate-900/98 backdrop-blur-lg p-5 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.5)] border-4 border-purple-500/60 relative overflow-hidden">
      {/* Neon glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 opacity-20 blur-xl pointer-events-none" />
      
      {/* Progress Bar */}
      <div className="mb-5 relative z-10">
        <div className="flex justify-between text-sm mb-2 font-bold uppercase tracking-wider">
          <span className="text-purple-200 drop-shadow-[0_0_8px_rgba(168,85,247,1)]">⚡ Progress</span>
          <span className="text-cyan-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,1)]">{visitedSteps.length} / {traversal.totalNodes} NODES</span>
        </div>
        <div className="w-full h-5 bg-slate-900/90 rounded-full overflow-hidden border-3 border-purple-400/70 shadow-[0_0_25px_rgba(168,85,247,0.6)]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,1)]"
            style={{ width: `${(visitedSteps.length / traversal.totalNodes) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Node */}
      {currentStep && (
        <div className="mb-5 p-4 bg-gradient-to-br from-slate-900/90 to-purple-900/70 rounded-xl border-4 border-yellow-400/60 shadow-[0_0_30px_rgba(250,204,21,0.6)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-orange-500/20 pointer-events-none" />
          <div className="text-yellow-300 text-xs mb-2 font-black uppercase tracking-widest drop-shadow-[0_0_4px_rgba(253,224,71,0.8)] relative z-10">🎯 CURRENT TARGET</div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 drop-shadow-[0_0_12px_rgba(251,191,36,1)] animate-pulse">
              {currentStep.value}
            </div>
            <div className="text-sm text-cyan-200 font-bold">
              <div className="text-lg drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]">STEP #{currentStep.sequenceIndex + 1}</div>
              <div className="text-xs text-purple-300 mt-1">Depth: {currentStep.depth}</div>
            </div>
          </div>
        </div>
      )}

      {/* Traversal Order */}
      <div className="relative z-10">
        <div className="text-purple-300 text-xs mb-3 font-black uppercase tracking-widest drop-shadow-[0_0_4px_rgba(168,85,247,0.8)]">📄 TRAVERSAL SEQUENCE</div>
        <div className="flex flex-wrap gap-2">
          {traversal.steps.map((step, index) => {
            const isVisited = visitedSteps.some(v => v.nodeId === step.nodeId);
            const isCurrent = currentStep?.nodeId === step.nodeId;

            return (
              <div
                key={step.nodeId}
                className={`
                  px-4 py-2 rounded-xl font-black text-base transition-all border-2
                  ${isCurrent
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white scale-110 shadow-[0_0_25px_rgba(251,191,36,0.9)] border-yellow-300 animate-pulse'
                    : isVisited
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)] border-green-400/50'
                    : 'bg-slate-800/80 text-slate-500 border-slate-600/50'
                  }
                `}
              >
                {step.value}
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithm Note */}
      <div className="mt-5 pt-5 border-t-2 border-purple-500/50 text-xs text-cyan-300 relative z-10">
        <span className="font-black text-purple-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.8)]">
          {traversal.type === 'preorder' && '👉 ROOT → LEFT → RIGHT'}
          {traversal.type === 'inorder' && '👉 LEFT → ROOT → RIGHT (SORTED)'}
          {traversal.type === 'postorder' && '👉 LEFT → RIGHT → ROOT'}
        </span>
        <span className="text-slate-400"> • </span>
        <span className="text-slate-300 font-semibold">Deterministic algorithm</span>
      </div>
    </div>
  );
}
