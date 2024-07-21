import { FETCH_PATTERNS_EXAMPLE_JSON } from "@constants/prompts";

const validateOpenaiPatternsResponse = (openaiResponse: unknown[]) => {
	if (!openaiResponse || !Array.isArray(openaiResponse)) {
		return false;
	}

	openaiResponse.forEach((response: unknown) => {
		if (!response || typeof response !== "object") {
			return false;
		}

		Object.entries(response).forEach(([key, value]) => {
			if (!value || !FETCH_PATTERNS_EXAMPLE_JSON[0][key] || typeof value !== typeof FETCH_PATTERNS_EXAMPLE_JSON[0][key]) {
				return false;
			}
		});
	});
	return true;
};

export default validateOpenaiPatternsResponse;
