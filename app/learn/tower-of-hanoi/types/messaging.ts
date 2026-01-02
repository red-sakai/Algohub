// Messages FROM PlayCanvas TO React
export type PlayCanvasMessage =
	| {
			type: "READY";
	  }
	| {
			type: "PLAYER_EVENT";
			data: {
				eventType: string;
				payload?: any;
			};
	  }
	| {
			type: "GAME_STATE_CHANGE";
			data: {
				state: string;
			};
	  }
	| {
			type: "PLAY_SFX";
			data: {
				src: string;
				volume?: number;
			};
	  }
	| {
			type: "SHOW_DIALOGUE";
			data: {
				character: string;
				text: string;
				choices?: string[];
			};
	  }
	| {
			type: "TRIGGER_ACHIEVEMENT";
			data: {
				achievementId: string;
			};
	  };

// Messages FROM React TO PlayCanvas
export type ReactToPlayCanvasMessage =
	| {
			type: "TRIGGER_EVENT";
			data: {
				eventName: string;
				payload?: any;
			};
	  }
	| {
			type: "UPDATE_STATE";
			data: {
				state: string;
			};
	  }
	| {
			type: "PAUSE_GAME";
	  }
	| {
			type: "RESUME_GAME";
	  }
	| {
			type: "DIALOGUE_CHOICE";
			data: {
				choiceIndex: number;
			};
	  };
