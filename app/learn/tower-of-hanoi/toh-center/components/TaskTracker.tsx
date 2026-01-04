interface TaskTrackerProps {
	rackFound: boolean;
}

export const TaskTracker = ({ rackFound }: TaskTrackerProps) => {
	return (
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
	);
};
