const tsConfigPaths = require("tsconfig-paths");

const baseUrl = "./"; // Either absolute or relative path. If relative it's resolved to current working directory.
const cleanup = tsConfigPaths.register({
	baseUrl,
	paths: {
		"@controllers/*": ["./controllers/*"],
		"@models/*": ["./models/*"],
		"@routes/*": ["./routes/*"],
		"@constants/*": ["./constants/*"],
		"@helpers/*": ["./helpers/*"],
		"@config/*": ["./config/*"],
		"@logger/*": ["./logger/*"],
		"@middlewares/*": ["./middlewares/*"],
	},
});

// When path registration is no longer needed
cleanup();
