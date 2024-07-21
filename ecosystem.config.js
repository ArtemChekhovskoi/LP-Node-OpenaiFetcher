const EXP_BACK_OFF_RESTART_DELAY = 1000;
module.exports = {
	apps: [
		{
			name: "create-openai-queue",
			script: "./services/createOpenaiQueue/start.js",
			autorestart: true,
			exec_mode: "fork",
			watch: false,
			exp_backoff_restart_delay: EXP_BACK_OFF_RESTART_DELAY,
			env_development: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
			max_memory_restart: "1G",
		},
		{
			name: "fetch-patterns",
			script: "./services/fetchPatterns/start.js",
			autorestart: true,
			exec_mode: "fork",
			watch: false,
			exp_backoff_restart_delay: EXP_BACK_OFF_RESTART_DELAY,
			env_development: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
			max_memory_restart: "1G",
		},
	],
};
