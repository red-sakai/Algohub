"use client";
import React, { useEffect, useRef } from "react";

export function PlayCanvasGame() {
	const containerRef = useRef<HTMLDivElement>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		document.body.style.overflow = "hidden";
		
		return () => {
			document.body.style.overflow = "auto";
		};
	}, []);

	return (
		<div 
			ref={containerRef}
			className="absolute inset-0 z-50 bg-black"
		>
			<iframe
				ref={iframeRef}
				src="/toh-room/index.html"
				className="w-full h-full border-0"
				title="Tower of Hanoi PlayCanvas Game"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
			/>
		</div>
	);
}
