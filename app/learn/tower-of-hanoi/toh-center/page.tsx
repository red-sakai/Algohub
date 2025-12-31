"use client";
import { useEffect } from "@/hooks/useEffect";
import { useState } from "@/hooks/useState";

export default function TohCenterPage() {
	const [isLoaded, setIsLoaded] = useState<boolean>(false);
	const [rackFound, setRackFound] = useState<boolean>(false);

	useEffect(() => {
		document.body.style.overflow = "hidden";
		
		// Show task after loading
		const loadTimer = setTimeout(() => {
			setIsLoaded(true);
		}, 3000);
		
		return () => {
			document.body.style.overflow = "auto";
			clearTimeout(loadTimer);
		};
	}, []);

	// Listen for rack found messages from PlayCanvas
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "OBJECT_CLICKED" && event.data.data?.objectType === "rack") {
				setRackFound(true);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	return (
		<>
			<style jsx global>{`
				#algohub-musicplayer-root {
					display: none !important;
				}
			`}</style>
			<style jsx>{`
				.retro-pixelated {
					image-rendering: pixelated;
					image-rendering: -moz-crisp-edges;
					image-rendering: crisp-edges;
					filter: contrast(1.4) saturate(1.3) brightness(1.05) blur(0.3px);
					transform: scale(0.7);
					transform-origin: center;
					width: 142.857%;
					height: 142.857%;
					position: absolute;
					left: -21.4285%;
					top: -21.4285%;
				}
				.retro-container::before {
					content: "";
					position: absolute;
					inset: 0;
					background: 
						repeating-linear-gradient(
							0deg,
							rgba(0, 0, 0, 0.25),
							rgba(0, 0, 0, 0.25) 3px,
							transparent 3px,
							transparent 6px
						),
						repeating-linear-gradient(
							90deg,
							rgba(0, 0, 0, 0.25),
							rgba(0, 0, 0, 0.25) 3px,
							transparent 3px,
							transparent 6px
						);
					pointer-events: none;
					z-index: 60;
					mix-blend-mode: multiply;
				}
				.retro-container::after {
					content: "";
					position: absolute;
					inset: 0;
					background: 
						radial-gradient(
							ellipse at center,
							transparent 0%,
							transparent 30%,
							rgba(0, 0, 0, 0.6) 65%,
							rgba(0, 0, 0, 0.95) 100%
						),
						repeating-linear-gradient(
							0deg,
							rgba(0, 255, 0, 0.02),
							rgba(0, 255, 0, 0.02) 1px,
							transparent 1px,
							transparent 2px
						);
					pointer-events: none;
					z-index: 61;
				}
				
				@keyframes cameraShake {
				0% { transform: translateX(0); }
				10% { transform: translateX(-6px); }
				20% { transform: translateX(6px); }
				30% { transform: translateX(-5px); }
				40% { transform: translateX(5px); }
				50% { transform: translateX(-6px); }
				60% { transform: translateX(6px); }
				70% { transform: translateX(-5px); }
				80% { transform: translateX(5px); }
				90% { transform: translateX(-6px); }
				100% { transform: translateX(0); }
				}
				
				@keyframes flicker {
					0%, 5%, 10%, 15%, 25%, 30%, 40%, 50%, 60%, 70%, 80%, 85%, 95%, 100% {
						opacity: 1;
					}
					6%, 11%, 16%, 41%, 71%, 86% {
						opacity: 0.3;
					}
					7%, 12%, 42%, 72% {
						opacity: 0;
					}
				}
				
				.flicker-overlay {
					position: absolute;
					inset: 0;
					background: black;
					pointer-events: none;
					z-index: 70;
					animation: flicker 8s infinite;
				}
			`}</style>
		<div className="fixed inset-0 w-full h-full">
			<div className="absolute inset-0 w-full h-full bg-black retro-container" style={{ animation: 'cameraShake 0.1s infinite' }}>
				<iframe
					src="/toh-center/index.html"
					className="w-full h-full border-0 retro-pixelated"
					title="Tower of Hanoi - Center"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					style={{ 
						imageRendering: 'pixelated',
						transform: 'translateZ(0)',
						willChange: 'auto'
					}}
				/>
				<div className="flicker-overlay" />
			</div>

			{/* Quest Tracker - Top Right */}
			{isLoaded && (
				<div className="absolute top-8 right-8 z-[70] pointer-events-none">
					<div className="bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md pointer-events-auto min-w-[400px] px-6 py-4">
						{/* Title */}
						<div className="pb-3 mb-3 border-b border-white/20">
							<h3 className="text-white font-light text-3xl tracking-wide">
								Task
							</h3>
						</div>
						
						{/* Objective with checkbox */}
						<div className="flex items-center justify-between gap-4">
							<p className="text-gray-300 text-base font-light">
								Find the broken data center rack
							</p>
							<div className={`w-10 h-10 border-2 flex items-center justify-center transition-all ${
								rackFound 
									? 'border-white bg-white/10' 
									: 'border-white/50 bg-transparent'
							}`}>
								{rackFound && (
									<span className="text-white text-2xl">✓</span>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
		</>
	);
}
