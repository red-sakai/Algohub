import { GoogleGenerativeAI } from '@google/generative-ai';

export type AdminInsightMetrics = {
	studentsTotal: number;
	studentsNew7d: number;
	studentsNew30d: number;
	achievementsTotal: number;
	achievementsNew7d: number;
	achievementsNew30d: number;
	asOf: string;
};

function getGeminiApiKey(): string {
	const key = process.env.GEMINI_API_KEY;
	if (!key || typeof key !== 'string' || key.trim().length === 0) {
		throw new Error('GEMINI_API_KEY is not configured');
	}
	return key.trim();
}

function getCandidateModels(): string[] {
	const configured = process.env.GEMINI_MODEL;
	const list: string[] = [];

	if (configured && typeof configured === 'string' && configured.trim().length > 0) {
		list.push(configured.trim());
	}

	// Model availability varies by account, region, and API version.
	// Keep a small fallback list of commonly supported aliases.
	// Newer families
	list.push('gemini-2.0-flash');
	list.push('gemini-2.0-flash-lite');
	list.push('gemini-2.0-pro');

	// 1.5 family
	list.push('gemini-1.5-flash-latest');
	list.push('gemini-1.5-flash');
	list.push('gemini-1.5-pro-latest');
	list.push('gemini-1.5-pro');

	// Older aliases still common on the Generative Language API
	list.push('gemini-pro');
	list.push('gemini-1.0-pro');

	// Dedupe while preserving order.
	return Array.from(new Set(list));
}

async function listModelsFromApiKey(): Promise<string[]> {
	const key = getGeminiApiKey();
	const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;

	const response = await fetch(url, { method: 'GET' });
	if (!response.ok) {
		throw new Error(`ListModels failed with status ${response.status}`);
	}

	const payload = (await response.json()) as {
		models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
	};

	const models = Array.isArray(payload.models) ? payload.models : [];
	const supported = models
		.filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
		.map((model) => (typeof model.name === 'string' ? model.name : ''))
		.filter((name): name is string => Boolean(name));

	// API returns names like "models/gemini-..."; the SDK expects "gemini-...".
	return supported
		.map((name) => (name.startsWith('models/') ? name.slice('models/'.length) : name))
		.filter((name) => name.length > 0);
}

export async function generateAdminInsight(metrics: AdminInsightMetrics): Promise<string> {
	const client = new GoogleGenerativeAI(getGeminiApiKey());

	const prompt = [
		'You are Jhezar, an analytics assistant for an education platform admin dashboard.',
		'Write a concise AI insight about how AlgoHub is doing.',
		'You may suggest ways to increase student activity, but do NOT claim those suggestions are based on data you were not given.',
		'Use the numbers provided for any quantitative statements; do not invent metrics or speculate.',
		'Output format:',
		'- First line: one short sentence summary (max 20 words).',
		'- Then 4 bullets, each starting with "-".',
		'- Bullets 1-2: interpret the student and achievement numbers.',
		'- Bullets 3-4: actionable suggestions to increase student activity (specific, realistic, and not dependent on new data).',
		'No markdown headings. No tables. No extra blank lines.',
		'',
		`As of: ${metrics.asOf}`,
		`Students total: ${metrics.studentsTotal}`,
		`New students (7d): ${metrics.studentsNew7d}`,
		`New students (30d): ${metrics.studentsNew30d}`,
		`Achievements total: ${metrics.achievementsTotal}`,
		`Achievements gained (7d): ${metrics.achievementsNew7d}`,
		`Achievements gained (30d): ${metrics.achievementsNew30d}`,
	].join('\n');

	let lastError: unknown = null;
	let text = '';

	const candidates = getCandidateModels();

	for (const modelName of candidates) {
		try {
			const model = client.getGenerativeModel({ model: modelName });
			const result = await model.generateContent(prompt);
			text = result.response.text();
			break;
		} catch (error) {
			lastError = error;
			// Try the next model name.
		}
	}

	if (!text) {
		try {
			const discovered = await listModelsFromApiKey();
			for (const modelName of discovered) {
				try {
					const model = client.getGenerativeModel({ model: modelName });
					const result = await model.generateContent(prompt);
					text = result.response.text();
					break;
				} catch (error) {
					lastError = error;
				}
			}
		} catch (error) {
			lastError = error;
		}
	}

	if (!text) {
		const base = 'Unable to generate AI insight (no supported Gemini model found).';
		if (lastError instanceof Error) {
			throw new Error(`${base} ${lastError.message}`);
		}
		throw new Error(base);
	}

	const cleaned = typeof text === 'string' ? text.trim() : '';

	if (!cleaned) {
		throw new Error('Gemini returned an empty response');
	}

	return cleaned;
}
