"use client";
import React from "react";

interface InteractableTooltipProps {
	label: string;
	x: number;
	y: number;
}

export function InteractableTooltip({ label, x, y }: InteractableTooltipProps) {
	return (
		<div
			className="fixed pointer-events-none z-[100] transition-all duration-150"
			style={{
				left: `${x}px`,
				top: `${y - 40}px`, // Offset above the object
				transform: "translateX(-50%)",
			}}
		>
			<div className="bg-black/90 text-yellow-400 px-4 py-2 rounded-lg border-2 border-yellow-500/50 shadow-lg backdrop-blur-sm">
				<div className="flex items-center gap-2">
					<span className="text-sm font-bold">[ {label} ]</span>
				</div>
			</div>
			{/* Arrow pointing down */}
			<div
				className="absolute left-1/2 -translate-x-1/2 top-full"
				style={{
					width: 0,
					height: 0,
					borderLeft: "6px solid transparent",
					borderRight: "6px solid transparent",
					borderTop: "6px solid rgba(234, 179, 8, 0.5)",
				}}
			/>
		</div>
	);
}
