import mongoose, { InferSchemaType, Schema } from "mongoose";

const usersOpenaiPatterns = new Schema(
	{
		usersID: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		openaiPatternsID: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		openaiPatternsQueueID: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		isPatternFound: {
			type: Boolean,
			required: true,
		},
		title: {
			type: String,
		},
		description: {
			type: String,
		},
		created: {
			type: Date,
			required: true,
			default: Date.now,
		},
	},
	{ collection: "users_openai_patterns" }
);

const UsersOpenaiPatterns = mongoose.model("users_openai_patterns", usersOpenaiPatterns);
export type TUsersOpenaiPatterns = InferSchemaType<typeof usersOpenaiPatterns>;
export { UsersOpenaiPatterns };
