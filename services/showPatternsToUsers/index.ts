import { logger } from "@logger/index";
import { UsersOpenaiPatterns } from "@models/users_openai_patterns";
import { OpenaiPatterns } from "@models/openai_patterns";
import { Notifications } from "@models/notifications";
import { UsersNotifications } from "@models/users_notifications";
import { ClientSession, Document, Schema, mongo } from "mongoose";

interface IReducesPattern {
	_id: Schema.Types.ObjectId;
	openaiPatternsID: Schema.Types.ObjectId;
	sort: number;
	title: string;
	description: string;
}
interface IUsersPatternToShow {
	usersID: Schema.Types.ObjectId;
	patterns: IReducesPattern[];
}
const showPatternsToUser = async (): Promise<void> => {
	let mongoSession: ClientSession | undefined;

	try {
		const usersPatternsFilter = {
			isShownToUser: false,
			isPatternFound: true,
		};

		const [usersPatternsToShow, patternNotificationConfig] = await Promise.all([
			UsersOpenaiPatterns.aggregate([
				{
					$match: usersPatternsFilter,
				},
				{
					$lookup: {
						from: OpenaiPatterns.collection.name,
						localField: "openaiPatternsID",
						foreignField: "_id",
						as: "patternConfig",
					},
				},
				{
					$unwind: {
						path: "$patternConfig",
					},
				},
				{
					$group: {
						_id: "$usersID",
						patterns: {
							$push: {
								_id: "$_id",
								openaiPatternsID: "$openaiPatternsID",
								sort: "$patternConfig.sort",
								title: "$title",
								description: "$description",
							},
						},
					},
				},
				{
					$project: {
						usersID: "$_id",
						patterns: true,
					},
				},
			]) as Promise<IUsersPatternToShow[] | []>,
			Notifications.findOne({ type: "newPatternFound", active: true }, { _id: true }),
		]);

		if (!patternNotificationConfig) {
			throw new Error("No pattern notification found");
		}

		if (!usersPatternsToShow?.length) {
			return;
		}
		const mostPriorityPatterns = usersPatternsToShow.map((userWithPatterns) => {
			const patternToShow = userWithPatterns.patterns.reduce((acc, pattern) => {
				if (!acc?.sort || acc?.sort > pattern?.sort) {
					acc = pattern;
				}
				return acc;
			}, {} as IReducesPattern);

			return {
				usersID: userWithPatterns.usersID,
				...patternToShow,
			};
		});

		const newUsersNotifications: Document<any>[] = [];
		const usersNotificationsToDelete: mongo.AnyBulkWriteOperation[] = [];
		const usersPatternsUpdate: mongo.AnyBulkWriteOperation[] = [];

		for (const usersPatterns of mostPriorityPatterns) {
			const newUsersNotification = new UsersNotifications({
				usersID: usersPatterns.usersID,
				notificationsID: patternNotificationConfig._id,
				isClosed: false,
				isClicked: false,
				additionalInfo: {
					usersPatternID: usersPatterns._id,
				},
			});

			const unreadNotificationsDelete = {
				deleteMany: {
					filter: { usersID: usersPatterns.usersID, notificationsID: patternNotificationConfig._id },
				},
			};

			newUsersNotifications.push(newUsersNotification);
			usersNotificationsToDelete.push(unreadNotificationsDelete);
			usersPatternsUpdate.push({
				updateOne: {
					filter: {
						_id: usersPatterns._id,
					},
					update: {
						$set: {
							isShownToUser: true,
							isViewedByUser: false,
							usersNotificationsID: newUsersNotification._id,
							shownTime: new Date(),
						},
					},
				},
			});
		}

		mongoSession = await UsersOpenaiPatterns.startSession();
		await mongoSession.withTransaction(async () => {
			await UsersNotifications.bulkWrite(usersNotificationsToDelete, { session: mongoSession });
			await UsersNotifications.insertMany(newUsersNotifications, { session: mongoSession });
			await UsersOpenaiPatterns.bulkWrite(usersPatternsUpdate, { session: mongoSession });
		});
		await mongoSession.endSession();
	} catch (e) {
		logger.error(`Error at showPatternsToUsers/index.ts: ${e}`);
		throw e;
	} finally {
		if (mongoSession) {
			await mongoSession.endSession();
		}
	}
};

export default showPatternsToUser;
