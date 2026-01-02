export const AnimationStyles = () => (
	<style jsx global>{`
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
		
		@keyframes timerPulse {
			0%, 100% { 
				color: #ff0000;
				text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
			}
			50% { 
				color: #ff6666;
				text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
			}
		}
		
		@keyframes glitchText {
			0% { transform: translate(0); }
			20% { transform: translate(-2px, 2px); }
			40% { transform: translate(-2px, -2px); }
			60% { transform: translate(2px, 2px); }
			80% { transform: translate(2px, -2px); }
			100% { transform: translate(0); }
		}
		
		@keyframes fadeInScale {
			from { 
				opacity: 0; 
				transform: scale(0.8);
			}
			to { 
				opacity: 1; 
				transform: scale(1);
			}
		}
		
		@keyframes bloodDrip {
			0% { top: -10%; opacity: 0; }
			10% { opacity: 1; }
			90% { opacity: 1; }
			100% { top: 110%; opacity: 0; }
		}
		
		@keyframes staticNoise {
			0%, 100% { opacity: 0.1; }
			50% { opacity: 0.3; }
		}
		
		@keyframes intensePulse {
			0%, 100% { 
				transform: scale(1);
				filter: brightness(1) drop-shadow(0 0 20px #ff0000);
			}
			50% { 
				transform: scale(1.05);
				filter: brightness(1.3) drop-shadow(0 0 40px #ff0000);
			}
		}
		
		@keyframes redPulse {
			0%, 100% {
				background-color: rgba(100, 0, 0, 0.95);
			}
			50% {
				background-color: rgba(180, 0, 0, 0.98);
			}
		}
	`}</style>
);
