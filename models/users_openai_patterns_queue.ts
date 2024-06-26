import mongoose, { InferSchemaType, Schema } from "mongoose";

const usersOpenaiPatternsQueue = new Schema(
	{
		usersID: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		openaiPatternsID: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		statusCode: {
			type: Number,
			required: true,
		},
		statusCodesHistory: [
			{
				statusCode: {
					type: Number,
					required: true,
				},
				created: {
					type: Date,
					required: true,
				},
			},
		],
		created: {
			type: Date,
			required: true,
			default: Date.now,
		},
		lastUpdated: {
			type: Date,
			required: true,
			default: Date.now,
		},
	},
	{ collection: "users_openai_patterns_queue" }
);

const UsersOpenaiPatternsQueue = mongoose.model("users_openai_patterns_queue", usersOpenaiPatternsQueue);
export type TUsersOpenaiPatternsQueue = InferSchemaType<typeof usersOpenaiPatternsQueue>;
export { UsersOpenaiPatternsQueue };
