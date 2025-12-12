"use client";
import { useMemo } from "react";

interface TreeVisualizationProps {
    values: (number | null)[];
    currentNode?: number;
    pathTaken?: number[];
}

export default function TreeVisualization({
    values,
    currentNode,
    pathTaken = []
}: TreeVisualizationProps) {
    // Calculate node positions for SVG rendering
    const nodes = useMemo(() => {
        const nodeData: Array<{
            index: number;
            value: number | null;
            x: number;
            y: number;
            level: number;
        }> = [];

        for (let i = 1; i <= 31; i++) {
            // Skip NULL nodes
            if (values[i] === null) continue;

            // Calculate level (0-indexed for math, but display as 1-indexed)
            const level = Math.floor(Math.log2(i));

            // Position within level
            const positionInLevel = i - Math.pow(2, level);
            const nodesInLevel = Math.pow(2, level);

            // Calculate x position (spread across width)
            const x = (positionInLevel + 0.5) / nodesInLevel;

            // Calculate y position
            const y = (level + 0.5) / 5; // 5 levels total

            nodeData.push({
                index: i,
                value: values[i],
                x,
                y,
                level,
            });
        }

        return nodeData;
    }, [values]);

    // Calculate edges connecting parent to children
    const edges = useMemo(() => {
        const edgeData: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

        nodes.forEach((node) => {
            const leftChildIndex = node.index * 2;
            const rightChildIndex = node.index * 2 + 1;

            const leftChild = nodes.find(n => n.index === leftChildIndex);
            const rightChild = nodes.find(n => n.index === rightChildIndex);

            if (leftChild) {
                edgeData.push({
                    x1: node.x,
                    y1: node.y,
                    x2: leftChild.x,
                    y2: leftChild.y,
                });
            }

            if (rightChild) {
                edgeData.push({
                    x1: node.x,
                    y1: node.y,
                    x2: rightChild.x,
                    y2: rightChild.y,
                });
            }
        });

        return edgeData;
    }, [nodes]);

    const getNodeColor = (value: number): string => {
        if (value > 0) return "#4ade80"; // green
        if (value < 0) return "#f87171"; // red
        return "#94a3b8"; // gray
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <svg
                viewBox="0 0 100 100"
                className="w-full h-auto"
                style={{ minHeight: "400px" }}
            >
                {/* Draw edges first (behind nodes) */}
                {edges.map((edge, idx) => (
                    <line
                        key={idx}
                        x1={edge.x1 * 100}
                        y1={edge.y1 * 100}
                        x2={edge.x2 * 100}
                        y2={edge.y2 * 100}
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="0.5"
                    />
                ))}

                {/* Draw nodes */}
                {nodes.map((node) => {
                    const isCurrentNode = currentNode === node.index;
                    const isInPath = pathTaken.includes(node.index);
                    const nodeColor = getNodeColor(node.value!);

                    return (
                        <g key={node.index}>
                            {/* Node circle */}
                            <circle
                                cx={node.x * 100}
                                cy={node.y * 100}
                                r={isCurrentNode ? 4 : 3}
                                fill={isCurrentNode ? "#0ea5e9" : nodeColor}
                                stroke={isInPath ? "#fbbf24" : "rgba(255, 255, 255, 0.5)"}
                                strokeWidth={isCurrentNode ? 1 : 0.5}
                                className={isCurrentNode ? "animate-pulse" : ""}
                            />

                            {/* Node value text */}
                            <text
                                x={node.x * 100}
                                y={node.y * 100}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize="3"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                {node.value}
                            </text>

                            {/* Node index (small, above) */}
                            <text
                                x={node.x * 100}
                                y={node.y * 100 - 5}
                                textAnchor="middle"
                                fill="rgba(255, 255, 255, 0.4)"
                                fontSize="1.5"
                                fontFamily="monospace"
                            >
                                [{node.index}]
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/70">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span>Positive</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span>Negative</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span>Zero</span>
                </div>
                {currentNode && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-sky-500 animate-pulse" />
                        <span>Current</span>
                    </div>
                )}
            </div>
        </div>
    );
}
