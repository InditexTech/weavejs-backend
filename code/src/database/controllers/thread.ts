import {
  ThreadAttributes,
  ThreadIdentifier,
  ThreadModel,
  ThreadStatus,
} from "../models/thread.js";

export const getRoomThreads = async (
  {
    roomId,
    status = "pending",
  }: {
    roomId: string;
    status: ThreadStatus | "all";
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<ThreadModel[]> => {
  return ThreadModel.findAll({
    where: {
      roomId,
      ...(status !== "all" && { status }),
    },
    order: [["updatedAt", "DESC"]],
    attributes: [
      "roomId",
      "threadId",
      "userId",
      "userMetadata",
      "x",
      "y",
      "content",
      "status",
      "replies",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getTotalRoomThreads = async ({
  roomId,
  status = "pending",
}: {
  roomId: string;
  status: ThreadStatus | "all";
}): Promise<number> => {
  return ThreadModel.count({
    where: {
      roomId,
      ...(status !== "all" && { status }),
    },
  });
};

export const getRoomAllThreads = async ({
  roomId,
  status = "pending",
}: {
  roomId: string;
  status: ThreadStatus | "all";
}): Promise<ThreadModel[]> => {
  return ThreadModel.findAll({
    where: {
      roomId,
      ...(status !== "all" && { status }),
    },
    order: [["updatedAt", "DESC"]],
    attributes: [
      "roomId",
      "threadId",
      "userId",
      "userMetadata",
      "x",
      "y",
      "content",
      "status",
      "replies",
      "createdAt",
      "updatedAt",
    ],
  });
};

export const getThread = async ({
  threadId,
}: ThreadIdentifier): Promise<ThreadModel | null> => {
  const thread = await ThreadModel.findOne({
    where: {
      threadId,
    },
    attributes: [
      "roomId",
      "threadId",
      "userId",
      "userMetadata",
      "x",
      "y",
      "content",
      "status",
      "replies",
      "createdAt",
      "updatedAt",
    ],
  });
  return thread;
};

export const createThread = async (
  threadData: ThreadAttributes
): Promise<ThreadModel> => {
  const newThread = await ThreadModel.create(threadData);

  return newThread;
};

export const updateThread = async (
  { threadId }: ThreadIdentifier,
  threadData: Partial<ThreadAttributes>,
  silent: boolean = false
): Promise<number> => {
  const affected = await ThreadModel.update(threadData, {
    where: {
      threadId,
    },
    silent,
  });

  return affected[0];
};

export const deleteThread = async ({
  threadId,
}: ThreadIdentifier): Promise<number> => {
  const affected = await ThreadModel.destroy({
    where: {
      threadId,
    },
  });

  return affected;
};
