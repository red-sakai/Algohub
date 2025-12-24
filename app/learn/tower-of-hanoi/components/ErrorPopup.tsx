interface ErrorPopupProps {
	onClose: () => void;
	onRetry: () => void;
}

export function ErrorPopup({ onClose, onRetry }: ErrorPopupProps) {
	return (
		<div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 animate-in fade-in duration-200">
			<div className="bg-gray-900 border-2 border-red-600 shadow-2xl shadow-red-900/50 w-[500px] animate-in zoom-in duration-300">
				{/* Window title bar */}
				<div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-xl">⚠</span>
						<span className="font-bold text-sm">CRITICAL ERROR</span>
					</div>
					<button
						onClick={onClose}
						className="hover:bg-red-700 px-2 py-1 text-xs"
					>
						✕
					</button>
				</div>

				{/* Window content */}
				<div className="p-6 space-y-4">
					<div className="flex items-start gap-4">
						<div className="text-red-500 text-4xl">⚠</div>
						<div className="flex-1 space-y-2">
							<h2 className="text-white font-bold text-lg">
								DATA CORRUPTION ERROR
							</h2>
							<p className="text-gray-300 text-sm">
								Critical system error detected. Memory address 0x7F4A39B2
								has been compromised.
							</p>
							<p className="text-red-400 text-xs font-mono">
								Error Code: 0x80004005
								<br />
								Timestamp: {new Date().toISOString()}
							</p>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
						<button
							onClick={onClose}
							className="px-4 py-2 bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
						>
							Ignore
						</button>
						<button
							onClick={onRetry}
							className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
						>
							Retry Connection
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
