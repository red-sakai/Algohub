"use client";

interface TraversalDisplayProps {
    preorder: number[];
    inorder: number[];
    postorder: number[];
}

export default function TraversalDisplay({ preorder, inorder, postorder }: TraversalDisplayProps) {
    const formatValue = (val: number) => {
        return val >= 0 ? `+${val}` : `${val}`;
    };

    const calculateSum = (values: number[]) => {
        return values.reduce((acc, v) => acc + v, 0);
    };

    const basePower = 10;
    const preSum = calculateSum(preorder);
    const inoSum = calculateSum(inorder);
    const postSum = calculateSum(postorder);

    const prePower = Math.max(basePower + preSum, 1);
    const inoPower = Math.max(basePower + inoSum, 1);
    const postPower = Math.max(basePower + postSum, 1);

    const renderTraversal = (name: string, values: number[], sum: number, power: number, color: string) => (
        <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 border-2 border-white/20`}>
            <h3 className="text-2xl font-bold text-white mb-4">{name}</h3>

            {/* Values */}
            <div className="flex flex-wrap gap-2 mb-4">
                {values.map((val, idx) => (
                    <div
                        key={idx}
                        className={`px-3 py-2 rounded-lg font-mono font-bold text-sm ${val > 0 ? 'bg-green-500/30 text-green-300' :
                                val < 0 ? 'bg-red-500/30 text-red-300' :
                                    'bg-gray-500/30 text-gray-300'
                            }`}
                    >
                        {formatValue(val)}
                    </div>
                ))}
            </div>

            {/* Calculation */}
            <div className="space-y-2 text-white/80 text-sm">
                <div>
                    <span className="text-white/60">Sum:</span>{' '}
                    <span className="font-mono font-bold">{sum > 0 ? '+' : ''}{sum}</span>
                </div>
                <div>
                    <span className="text-white/60">Base Power:</span>{' '}
                    <span className="font-mono font-bold">{basePower}</span>
                </div>
                <div className="pt-2 border-t border-white/20">
                    <span className="text-white/60">Final Power:</span>{' '}
                    <span className="font-mono font-bold text-2xl text-amber-400">{power}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-black text-white mb-2">Tree Traversals</h2>
                <p className="text-white/60">Different orders produce the same sum (for addition)</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {renderTraversal('Preorder', preorder, preSum, prePower, 'from-purple-500/20 to-pink-500/20')}
                {renderTraversal('Inorder', inorder, inoSum, inoPower, 'from-blue-500/20 to-cyan-500/20')}
                {renderTraversal('Postorder', postorder, postSum, postPower, 'from-orange-500/20 to-red-500/20')}
            </div>

            {/* Info */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-white/70 text-sm text-center">
                    💡 Formula: <span className="font-mono">FinalPower = max(BasePower + Sum, 1)</span>
                </p>
            </div>
        </div>
    );
}
