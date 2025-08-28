import { Sequelize, Model, DataTypes } from "sequelize";

export type TaskStatus = "created" | "active" | "failed" | "completed";
export type TaskType =
  | "removeImageBackground"
  | "generateImages"
  | "editImage"
  | "editImageMask"
  | "editImageReferences";

export type TaskAttributes = {
  jobId: string;
  roomId: string;
  userId: string;
  type: string;
  status: TaskStatus;
  opened: boolean;
  metadata: unknown;
};

export type TaskIdentifier = Pick<TaskAttributes, "jobId">;

export type TaskCreationAttributes = Omit<TaskAttributes, "jobId">;

export class TaskModel
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare roomId: string;
  declare userId: string;
  declare jobId: string;
  declare type: TaskType;
  declare status: TaskStatus;
  declare opened: boolean;
  declare metadata: unknown;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const defineTaskModel = async (sequelize: Sequelize) => {
  TaskModel.init(
    {
      jobId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      opened: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "weavejs_task",
      timestamps: true,
      sequelize,
    }
  );
};
