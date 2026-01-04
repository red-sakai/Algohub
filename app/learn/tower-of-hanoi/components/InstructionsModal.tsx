"use client";
import { useEffect } from "@/hooks/useEffect";

interface InstructionsModalProps {
	onClose: () => void;
}

export function InstructionsModal({ onClose }: InstructionsModalProps) {
	useEffect(() => {
		// Close on any key press
		const handleKeyDown = () => {
			onClose();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div 
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-in fade-in duration-200 cursor-pointer"
			onClick={onClose}
		>
			<div className="relative">
				<img 
					src="/instructions.svg" 
					alt="Tower of Hanoi Instructions"
					className="max-w-[95vw] max-h-[95vh] object-contain animate-in zoom-in duration-300 scale-125"
				/>
				<div className="absolute bottom-[-80px] left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md px-6 py-4 min-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
					<p className="text-gray-300 text-base font-light text-center">
						Press <span className="text-white font-medium">ESC</span> and <span className="text-white font-medium">click anywhere</span> to close
					</p>
				</div>
			</div>
		</div>
	);
}
