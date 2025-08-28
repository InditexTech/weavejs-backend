import {
  TaskAttributes,
  TaskCreationAttributes,
  TaskIdentifier,
  TaskModel,
} from "../models/task.js";

export const getTasksRoomAndUser = async (
  {
    roomId,
    userId,
  }: {
    roomId: string;
    userId: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<TaskModel[]> => {
  return TaskModel.findAll({
    where: {
      roomId,
      userId,
    },
    order: [["createdAt", "DESC"]],
    attributes: [
      "jobId",
      "roomId",
      "userId",
      "type",
      "status",
      "opened",
      "metadata",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getTasksRoom = async (
  {
    roomId,
  }: {
    roomId: string;
  },
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }
): Promise<TaskModel[]> => {
  return TaskModel.findAll({
    where: {
      roomId,
    },
    order: [["createdAt", "DESC"]],
    attributes: [
      "jobId",
      "roomId",
      "userId",
      "type",
      "status",
      "opened",
      "metadata",
      "createdAt",
      "updatedAt",
    ],
    limit,
    offset,
  });
};

export const getTasksRoomAndUserNotOpened = async ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}): Promise<TaskModel[]> => {
  return TaskModel.findAll({
    where: {
      roomId,
      userId,
      opened: false,
    },
    order: [["createdAt", "DESC"]],
    attributes: [
      "jobId",
      "roomId",
      "userId",
      "type",
      "status",
      "opened",
      "metadata",
      "createdAt",
      "updatedAt",
    ],
  });
};

export const getTask = async ({
  jobId,
}: TaskIdentifier): Promise<TaskModel | null> => {
  const task = await TaskModel.findOne({
    where: {
      jobId,
    },
    attributes: [
      "jobId",
      "roomId",
      "userId",
      "type",
      "status",
      "opened",
      "metadata",
      "createdAt",
      "updatedAt",
    ],
  });
  return task;
};

export const createTask = async (
  taskData: TaskAttributes
): Promise<TaskModel> => {
  const newJob = await TaskModel.create(taskData);

  return newJob;
};

export const updateTask = async (
  { jobId }: TaskIdentifier,
  taskData: Partial<TaskCreationAttributes>
): Promise<number> => {
  const affected = await TaskModel.update(taskData, {
    where: {
      jobId,
    },
  });

  return affected[0];
};

export const deleteTask = async ({
  jobId,
}: TaskIdentifier): Promise<number> => {
  const affected = await TaskModel.destroy({
    where: {
      jobId,
    },
  });

  return affected;
};
