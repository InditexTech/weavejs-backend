import {
  ThreadAnswerAttributes,
  ThreadAnswerIdentifier,
  ThreadAnswerModel,
} from "../models/thread-answer.js";
import { getThread, updateThread } from "./thread.js";

export const getThreadAnswers = async (
  {
    threadId,
  }: {
    threadId: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<ThreadAnswerModel[]> => {
  return ThreadAnswerModel.findAll({
    where: {
      threadId,
    },
    order: [["updatedAt", "ASC"]],
    attributes: [
      "answerId",
      "threadId",
      "userId",
      "userMetadata",
      "content",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getThreadAllAnswers = async ({
  threadId,
}: {
  threadId: string;
}): Promise<ThreadAnswerModel[]> => {
  return ThreadAnswerModel.findAll({
    where: {
      threadId,
    },
    order: [["updatedAt", "ASC"]],
    attributes: [
      "answerId",
      "threadId",
      "userId",
      "userMetadata",
      "content",
      "createdAt",
      "updatedAt",
    ],
  });
};

export const getThreadAnswer = async ({
  answerId,
}: ThreadAnswerIdentifier): Promise<ThreadAnswerModel | null> => {
  const thread = await ThreadAnswerModel.findOne({
    where: {
      answerId,
    },
    attributes: [
      "answerId",
      "threadId",
      "userId",
      "userMetadata",
      "content",
      "createdAt",
      "updatedAt",
    ],
  });
  return thread;
};

export const createThreadAnswer = async (
  threadAnswerData: ThreadAnswerAttributes
): Promise<ThreadAnswerModel> => {
  const newThread = await ThreadAnswerModel.create(threadAnswerData);

  const thread = await getThread({
    threadId: threadAnswerData.threadId,
  });

  if (thread) {
    await updateThread(
      {
        threadId: thread.threadId,
      },
      {
        replies: thread.replies + 1,
      },
      true
    );
  }

  return newThread;
};

export const updateThreadAnswer = async (
  { answerId }: ThreadAnswerIdentifier,
  threadAnswerData: Partial<ThreadAnswerAttributes>
): Promise<number> => {
  const affected = await ThreadAnswerModel.update(threadAnswerData, {
    where: {
      answerId,
    },
  });

  return affected[0];
};

export const deleteThreadAnswer = async ({
  answerId,
}: ThreadAnswerIdentifier): Promise<number> => {
  const threadAnswer = await getThreadAnswer({ answerId });

  const affected = await ThreadAnswerModel.destroy({
    where: {
      answerId,
    },
  });

  if (threadAnswer) {
    const thread = await getThread({
      threadId: threadAnswer.threadId,
    });

    if (thread) {
      await updateThread(
        {
          threadId: thread.threadId,
        },
        {
          replies: thread.replies - 1,
        }
      );
    }
  }

  return affected;
};
