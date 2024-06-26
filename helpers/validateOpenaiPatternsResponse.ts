import { FETCH_PATTERNS_EXAMPLE_JSON } from "@constants/prompts";

const validateOpenaiPatternsResponse = (openaiResponse: unknown) => {
	if (!openaiResponse || typeof openaiResponse !== "object") {
		return false;
	}

	Object.entries(openaiResponse).forEach(([key, value]) => {
		if (!value || !FETCH_PATTERNS_EXAMPLE_JSON[key] || typeof value !== typeof FETCH_PATTERNS_EXAMPLE_JSON[key]) {
			return false;
		}
	});
	return true;
};

export default validateOpenaiPatternsResponse;
