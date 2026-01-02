'use client';

/**
 * Algorithm Explanation Component
 * Educational overlay showing algorithm details and academic justification
 */

import { TraversalType, TreeNode3D } from '@/types/pinball';
import { explainTraversal, traceTraversal, verifyInorderSorted, inorder } from '@/lib/pinball/treeAlgorithms';

interface Props {
  traversalType: TraversalType;
  tree: TreeNode3D | null;
}

export default function AlgorithmExplanation({ traversalType, tree }: Props) {
  const explanation = explainTraversal(traversalType);

  // Verify inorder produces sorted sequence (academic proof)
  const inorderValid = tree ? verifyInorderSorted(inorder(tree)) : null;

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm p-5 rounded-xl shadow-2xl border border-slate-700 max-w-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          traversalType === 'preorder' ? 'bg-red-500' :
          traversalType === 'inorder' ? 'bg-green-500' :
          'bg-blue-500'
        }`} />
        <h3 className="text-white font-bold text-lg">
          {traversalType.charAt(0).toUpperCase() + traversalType.slice(1)} Algorithm
        </h3>
      </div>

      {/* Explanation */}
      <div className="text-slate-300 text-sm mb-4 whitespace-pre-line leading-relaxed">
        {explanation}
      </div>

      {/* Pseudocode */}
      <div className="bg-slate-900/80 p-4 rounded-lg mb-4 font-mono text-xs">
        <div className="text-green-400 mb-2">// Recursive Implementation</div>
        {traversalType === 'preorder' && (
          <pre className="text-slate-300">{`function preorder(node):
  if node is null:
    return
  
  visit(node)        // 1️⃣
  preorder(node.left)   // 2️⃣
  preorder(node.right)  // 3️⃣`}</pre>
        )}
        {traversalType === 'inorder' && (
          <pre className="text-slate-300">{`function inorder(node):
  if node is null:
    return
  
  inorder(node.left)    // 1️⃣
  visit(node)        // 2️⃣
  inorder(node.right)   // 3️⃣`}</pre>
        )}
        {traversalType === 'postorder' && (
          <pre className="text-slate-300">{`function postorder(node):
  if node is null:
    return
  
  postorder(node.left)  // 1️⃣
  postorder(node.right) // 2️⃣
  visit(node)        // 3️⃣`}</pre>
        )}
      </div>

      {/* Academic Validation */}
      {traversalType === 'inorder' && inorderValid !== null && (
        <div className={`p-3 rounded-lg mb-4 ${
          inorderValid ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
        }`}>
          <div className="text-xs font-semibold mb-1">
            {inorderValid ? '✓ Algorithm Verified' : '✗ Verification Failed'}
          </div>
          <div className="text-xs text-slate-300">
            {inorderValid
              ? 'Inorder traversal produces sorted sequence (BST property validated)'
              : 'Warning: Sorted order not maintained'
            }
          </div>
        </div>
      )}

      {/* Complexity */}
      <div className="text-xs text-slate-400 space-y-1">
        <div><span className="font-semibold text-slate-300">Time:</span> O(n) - visits each node once</div>
        <div><span className="font-semibold text-slate-300">Space:</span> O(h) - recursion stack height</div>
        <div><span className="font-semibold text-slate-300">Determinism:</span> Always same order for same tree</div>
      </div>

      {/* Use Cases */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs font-semibold text-slate-300 mb-2">Real-World Use Cases:</div>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          {traversalType === 'preorder' && (
            <>
              <li>Tree serialization/copying</li>
              <li>Prefix expression evaluation</li>
              <li>File system directory traversal</li>
            </>
          )}
          {traversalType === 'inorder' && (
            <>
              <li>Get sorted data from BST</li>
              <li>Validate BST property</li>
              <li>Expression tree evaluation</li>
            </>
          )}
          {traversalType === 'postorder' && (
            <>
              <li>Delete tree (children first)</li>
              <li>Postfix expression evaluation</li>
              <li>Calculate subtree properties</li>
            </>
          )}
        </ul>
      </div>

      {/* Academic Footer */}
      <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500 text-center">
        Algorithm integrity guaranteed • No randomness in traversal order
      </div>
    </div>
  );
}
